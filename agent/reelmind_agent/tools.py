"""ReelMind companion tools.

Every tool:
  * is a plain, dependency-light function (testable without AWS),
  * closes over (memory, llm) — memory for state, llm for "fast lane"
    model work (quiz gen, grading, explains, discussion prompts),
  * returns a JSON *string* of a CompanionReply card. The system prompt
    tells the model to relay tool cards verbatim as its final answer.
"""

from __future__ import annotations

import json
import os
import re
from typing import Any, Dict, List, Optional

from tv_agent_kit import (
    CompanionAction,
    CompanionReply,
    LLMClient,
    MemoryStore,
    Quiz,
    complete_json,
    tool,
)

# ---------------------------------------------------------------------------
# Curated catalog (anchors briefings; the model still enriches from its own
# knowledge for anything not listed).
# ---------------------------------------------------------------------------

_CATALOG_PATH = os.path.join(os.path.dirname(__file__), "catalog.json")


def _load_catalog() -> List[Dict[str, Any]]:
    try:
        with open(_CATALOG_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except (OSError, json.JSONDecodeError):
        return []


def _catalog_entry(title: str) -> Optional[Dict[str, Any]]:
    t = title.strip().lower()
    for entry in _load_catalog():
        if entry["title"].lower() == t or t in entry["title"].lower():
            return entry
    return None


# ---------------------------------------------------------------------------
# Pure helpers (unit-tested directly)
# ---------------------------------------------------------------------------

def spoiler_status(progress: Dict[str, Any], title: str) -> str:
    """One-line spoiler posture for prompt injection / UI badges."""
    p = (progress or {}).get(title.strip().lower(), {})
    if not p:
        return f"no stored progress for '{title}'"
    return f"viewer is on {p['title']} S{p['season']}E{p['episode']} — spoilers locked past that point"


def _norm(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").strip().casefold())


def normalize_quiz_answer(options: List[str], correct_index: int, user_answer: str) -> Optional[bool]:
    """Deterministic grading. Returns True/False when confident, None when
    the answer is free-text that needs LLM adjudication."""
    ua = _norm(user_answer)
    if not ua:
        return False
    # Direct match of the correct option (or a strong prefix of it).
    correct = _norm(options[correct_index])
    if ua == correct or (len(ua) >= 4 and (correct.startswith(ua) or ua.startswith(correct))):
        return True
    # Letter (a-d) or number (1-4) picks.
    letter = ua[0] if ua[:1] in ("a", "b", "c", "d") else None
    if letter:
        idx = ord(letter) - ord("a")
        if 0 <= idx < len(options):
            return idx == correct_index
    if ua[:1].isdigit() and ua in {str(i) for i in range(1, len(options) + 1)}:
        return int(ua) - 1 == correct_index
    # Picked a different option verbatim -> confidently wrong.
    for i, opt in enumerate(options):
        if i != correct_index and ua == _norm(opt):
            return False
    return None  # needs adjudication


# ---------------------------------------------------------------------------
# Tool factory
# ---------------------------------------------------------------------------

def build_tools(memory: MemoryStore, llm: LLMClient, fast_model: Optional[str] = None) -> List[Any]:
    """Build the six ReelMind tools bound to this process's memory + llm.

    fast_model: Bedrock model id for the latency-sensitive "fast lane" work
    (quiz gen, grading, explains, prompts). None = LLMClient default (which is
    the fast model when json_mode=True)."""

    def _card(reply: CompanionReply) -> str:
        return json.dumps(reply.to_wire(), ensure_ascii=False)

    @tool
    def set_progress(viewer: str, title: str, season: int, episode: int, note: str = "") -> str:
        """Record how far a viewer is in a show so future answers avoid spoilers.
        Args: viewer (viewer id), title (show title), season (int), episode (int), note (optional)."""
        record = memory.set_progress(viewer, title, season, episode, note or "")
        return _card(
            CompanionReply(
                kind=CompanionAction.PROGRESS_UPDATE,
                text=f"Locked in: {record['title']} S{record['season']}E{record['episode']}. Spoilers stay on the other side of that.",
                progress=record,
            )
        )

    @tool
    def get_progress(viewer: str) -> str:
        """Look up a viewer's stored progress across all shows. Args: viewer (viewer id)."""
        progress = memory.get(viewer).get("progress", {})
        if not progress:
            return _card(
                CompanionReply(
                    kind=CompanionAction.ANSWER,
                    text="No progress stored yet. Tell me where you are in a show and I'll lock spoilers for it.",
                )
            )
        lines = [f"{p['title']} — S{p['season']}E{p['episode']}" for p in progress.values()]
        return _card(
            CompanionReply(kind=CompanionAction.ANSWER, text="Here's where you are: " + " · ".join(lines[:6]))
        )

    @tool
    def generate_quiz(topic: str, difficulty: str = "medium", num_questions: int = 3) -> str:
        """Generate a pop quiz about a show, film, or topic.
        Args: topic (what to quiz on), difficulty (easy|medium|hard), num_questions (1-5)."""
        n = max(1, min(5, int(num_questions)))
        difficulty = difficulty if difficulty in ("easy", "medium", "hard") else "medium"
        system = (
            "You generate pop quizzes for a TV viewing companion. "
            "Questions must be answerable from general knowledge, unambiguous, "
            "and fun on a 10-foot display. Each question has EXACTLY 4 options. "
            "Respond with ONLY a JSON object of shape: "
            '{"topic": str, "difficulty": str, "questions": '
            '[{"id": "q1", "question": str, "options": [str, str, str, str], '
            '"correct_index": int, "explanation": str}]}'
        )
        user = f"Topic: {topic}. Difficulty: {difficulty}. Number of questions: {n}."
        try:
            data = complete_json(llm, system, user, model=fast_model, max_tokens=900, temperature=0.9)
            quiz = Quiz.model_validate(data)
        except Exception as e:  # noqa: BLE001
            return _card(CompanionReply.error("quiz_generation", f"Quiz engine hiccup: {e.__class__.__name__}"))
        return _card(CompanionReply(kind=CompanionAction.QUIZ, text=f"Pop quiz: {quiz.topic} ({quiz.difficulty}) — {len(quiz.questions)} questions. Let's go.", quiz=quiz))

    @tool
    def grade_quiz_answer(question: str, options: List[str], correct_index: int, user_answer: str) -> str:
        """Grade a viewer's answer to a quiz question.
        Args: question (question text), options (list of option texts), correct_index (0-based), user_answer (viewer's answer text)."""
        verdict = normalize_quiz_answer(options, int(correct_index), user_answer)
        explanation = ""
        if verdict is None:
            system = (
                "You adjudicate quiz answers. A user answer counts as correct only if it is "
                "unambiguously the correct option (paraphrase or partial recall of the right "
                "answer counts; anything else does not). Respond with ONLY JSON: "
                '{"correct": bool, "why": str}'
            )
            user = (
                f"Question: {question}\nOptions: {json.dumps(options)}\n"
                f"Correct option: {options[int(correct_index)]}\nUser answer: {user_answer}"
            )
            try:
                data = complete_json(llm, system, user, model=fast_model, max_tokens=120, temperature=0.0)
                verdict = bool(data.get("correct"))
                explanation = str(data.get("why", ""))
            except Exception:  # noqa: BLE001
                verdict = False
        result = {
            "correct": bool(verdict),
            "correct_answer": options[int(correct_index)],
            "explanation": explanation,
        }
        text = "Nailed it! ✅" if verdict else f"Not quite — it's {options[int(correct_index)]}."
        if explanation:
            text = f"{text} {explanation}"
        return _card(
            CompanionReply(kind=CompanionAction.QUIZ_RESULT, text=text, quiz_result=result)
        )

    @tool
    def explain_topic(topic: str, level: str = "standard") -> str:
        """Explain a concept, science topic, historical event, or term that appears in what the viewer is watching.
        Args: topic (what to explain), level (kid|standard|deep)."""
        level = level if level in ("kid", "standard", "deep") else "standard"
        specs = {
            "kid": "Explain it to a bright 9-year-old. No jargon. Under 4 sentences. End with one fun fact. Under 60 words.",
            "standard": "Explain it clearly and accurately in 2-4 sentences. Under 90 words.",
            "deep": "Explain it in depth in 4-6 sentences, including the key terms and why it matters. Under 160 words.",
        }
        system = (
            f"{specs[level]} Respond with ONLY a JSON object: {{'text': str}}. "
            "Be accurate; if the topic is ambiguous, explain the most common meaning."
        )
        try:
            data = complete_json(llm, system, f"Topic: {topic}", model=fast_model, max_tokens=400, temperature=0.4)
            text = str(data.get("text", "")).strip()
            if not text:
                raise ValueError("empty explanation")
        except Exception:  # noqa: BLE001
            return _card(CompanionReply.error("explain_failed", f"I couldn't pull an explanation for '{topic}'."))
        return _card(CompanionReply(kind=CompanionAction.EXPLAIN, level=level, text=text))

    @tool
    def suggest_discussion(title: str, season: int = 0, episode: int = 0) -> str:
        """Generate watch-party discussion prompts for a show (between episodes is the sweet spot).
        Args: title (show title), season (optional, 0 = unknown), episode (optional, 0 = unknown)."""
        entry = _catalog_entry(title)
        context = f" About the show: {entry['premise']} (known for: {entry['known_for']})" if entry else ""
        where = f" after S{season}E{episode}" if season and episode else ""
        system = (
            "You write watch-party discussion prompts for a TV companion. "
            "Prompts must be specific to the show, invite light debate, and avoid "
            "spoiling what comes next. Respond with ONLY JSON: {'prompts': [str, str, str]}"
        )
        try:
            data = complete_json(
                llm,
                system,
                f"Show: {title}{context}. Generate 3 prompts for viewers to discuss{where}.",
                model=fast_model,
                max_tokens=400,
                temperature=0.9,
            )
            prompts = [str(p).strip() for p in data.get("prompts", []) if str(p).strip()][:3]
            if not prompts:
                raise ValueError("no prompts")
        except Exception:  # noqa: BLE001
            return _card(CompanionReply.error("discussion_failed", "Couldn't generate discussion prompts."))
        sections = [{"heading": f"{i + 1}.", "body": p} for i, p in enumerate(prompts)]
        return _card(
            CompanionReply(
                kind=CompanionAction.DISCUSSION,
                text=f"Between-episode fuel for {title}:",
                sections=sections,
            )
        )

    return [set_progress, get_progress, generate_quiz, grade_quiz_answer, explain_topic, suggest_discussion]

