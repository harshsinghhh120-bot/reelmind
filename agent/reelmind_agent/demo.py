"""Demo mode — deterministic offline stand-in LLM.

Set DEMO_MODE=1 to run the entire ReelMind stack (TV client → FastAPI →
agent → CompanionReply cards) with NO AWS account and NO network calls.
Responses are canned but follow the real protocol exactly, so the TV app,
focus system, quiz loop, spoiler badges, and memory sync all behave for
real. Clearly labeled in every card.

This is a development/demo aid, not a feature: the production path
(DEMO_MODE unset) uses Claude on Amazon Bedrock via Strands.
"""

from __future__ import annotations

import json
import re
from typing import Any, Dict, List, Optional

from .tools import _load_catalog

_ABOUT = re.compile(r"^About\s+(.+?):\s*(.+)$", re.DOTALL)
_PROGRESS = re.compile(r"S(\d+)\s*E(\d+)")
_QUIZ_TOPIC = re.compile(
    r"Pop quiz about (.+?)(?:[!.]|\s+\d+\s+questions|\s+(?:easy|medium|hard)\b|$)", re.IGNORECASE
)

_GENRES = ["Drama", "Comedy", "Sci-Fi", "Thriller", "Historical", "Horror", "Documentary", "Fantasy"]

_EXPLAIN_BANK: Dict[str, tuple] = {
    "stock market": ("A giant marketplace where people trade pieces of companies called shares.",
                     "The stock market is where investors buy and sell shares of public companies. Prices move on supply, demand, and expectations — when a company seems promising, people bid the price up."),
    "quantum entanglement": ("Two particles can be linked so that measuring one instantly tells you about the other, no matter the distance.",
                             "Quantum entanglement is when two particles share one combined state. Measuring one particle immediately determines the outcome for the other, even across vast distances — Einstein called it 'spooky action at a distance.'"),
    "feudal japan": ("A system where powerful samurai warriors served lords who ruled farmland given by the emperor.",
                     "Feudal Japan (roughly 12–19th c.) was a hierarchy: the emperor at the top, powerful shoguns and daimyo lords ruling provinces, and samurai warriors bound by loyalty. Control of land and warriors was the real currency of power."),
    "jazz improvisation": ("Musicians making up beautiful melodies on the spot, like a conversation where everyone speaks at once.",
                             "Jazz improvisation is spontaneous composition: players build on chord changes and each other's phrases in the moment. It rewards vocabulary (scales, licks, forms) and listening — a good solo is a response, not a monologue."),
    "cryptocurrency": ("Money that lives on a shared digital ledger instead of in banks, secured by math puzzles.",
                       "Cryptocurrencies are digital money backed by cryptography and a public ledger (a blockchain). Instead of a bank verifying transactions, a network of computers agrees on the ledger, using incentives and proof-of-work/proof-of-stake rules."),
    "nuclear fusion": ("Crushing two tiny atoms together until they merge and release enormous energy — that's how the sun shines.",
                        "Nuclear fusion joins light atomic nuclei (like hydrogen) into heavier ones (helium), releasing energy from the mass difference (E=mc²). It's the Sun's power source; on Earth it's the hardest engineering challenge in energy."),
    "metaverse": ("A shared virtual world where you hang out, play, and buy things with a headset on.",
                  "The metaverse is the idea of persistent, shared 3D online spaces blending gaming, social media, and commerce. In practice today it's mostly virtual events and games — the 'everything happens there' vision is still ahead of the tech."),
    "sashimi etiquette": ("Sashimi is raw fish sliced thin — you eat it with the chopsticks, a little soy, and no mixing up flavors.",
                          "Sashimi etiquette: eat slices in the order served (light to rich), dip soy in the spoon side of the chopsticks rather than the fish, and don't mix soy with wasabi on the piece unless you like it."),
}

_DISCUSSION = [
    "If the main character made one different choice this episode, where does the story break first?",
    "Who in this scene is telling you the most with the fewest words?",
    "What's a detail the first-time watcher almost certainly missed — and what does it foreshadow?",
]


class DemoLLMClient:
    """Deterministic, offline LLMClient. Same interface as BedrockLLMClient."""

    def __init__(self):
        self._quizzes: Dict[str, Dict[str, str]] = {}  # viewer -> {qid: correct option}

    # ------------------------------------------------------------------

    def complete(self, system: str, user: str, **kwargs: Any) -> str:
        viewer = self._viewer(user)
        # The prompt shape is "…\n\nUser message: <message>" (kit context block);
        # isolate the message before matching intents.
        mm = re.search(r"User message:\s*(.+)$", user, re.DOTALL)
        message = (mm.group(1).strip() if mm else user.strip())
        m = _ABOUT.match(message)
        title = m.group(1).strip() if m else None
        rest = (m.group(2) if m else message)

        # 1) Structured quiz answer (from the TV client's quiz flow)
        if rest.startswith("[structured] The viewer answered question"):
            return self._grade(viewer, rest)

        low = rest.lower()

        # 2) Pop quiz
        if "pop quiz" in low or "give me a quiz" in low:
            topic = title or (self._quiz_topic(rest) or "TV")
            return self._card(self._quiz(viewer, topic))

        # 3) Explain
        if low.startswith("explain "):
            topic = rest[len("explain "):].strip()
            level = "kid" if "kid" in low else "deep" if "deep" in low else "standard"
            return self._card(self._explain(topic, level))

        # 4) Watch party
        if "discussion prompt" in low or "watch party" in low:
            return self._card(self._discussion(title or rest))

        # 5) Progress
        prog = _PROGRESS.search(rest)
        if "at the end" in low:
            return self._card(self._progress(title or "this show", 99, 99, "end"))
        if prog:
            return self._card(self._progress(title or "this show", int(prog.group(1)), int(prog.group(2)), ""))

        # 6) Briefing
        if "what's this" in low or "what is " in low or "briefing" in low:
            t = title or self._title_from(rest) or "your show"
            return self._card(self._briefing(t))

        # 7) Fallback: honest canned answer
        from tv_agent_kit import CompanionReply

        reply = CompanionReply(
            kind="answer",
            text=(
                f"Demo mode (DEMO_MODE=1) — this answer is canned. You said: “{rest[:120]}”. "
                "Point the agent at real AWS credentials (run without DEMO_MODE) for live Claude answers."
            ),
        )
        return self._card(reply)

    # ------------------------------------------------------------------

    @staticmethod
    def _viewer(user: str) -> str:
        m = re.search(r"Viewer:\s*(\S+)", user)
        return m.group(1) if m else "default"

    @staticmethod
    def _quiz_topic(rest: str) -> Optional[str]:
        m = _QUIZ_TOPIC.search(rest)
        return m.group(1).strip() if m else None

    @staticmethod
    def _title_from(rest: str) -> Optional[str]:
        m = re.search(r"(?:what's this:|what is|about)\s+(.+?)(?:\?|!|\.)", rest, re.IGNORECASE)
        if m:
            return m.group(1).strip(" .")
        m = re.match(r"^(?:what's this:|what is)\s+(.+)$", rest.strip(), re.IGNORECASE)
        return m.group(1).strip(" .?") if m else None

    @staticmethod
    def _card(reply: Any) -> str:
        return json.dumps(reply.to_wire(), ensure_ascii=False)

    # --- canned cards ----------------------------------------------------

    def _progress(self, title: str, season: int, episode: int, note: str) -> Any:
        from tv_agent_kit import CompanionAction, CompanionReply

        where = "the end" if season >= 99 else f"S{season}E{episode}"
        return CompanionReply(
            kind=CompanionAction.PROGRESS_UPDATE,
            text=f"Locked in: {title} — {where} (demo). Spoilers stay on the other side.",
            progress={"title": title, "season": season, "episode": episode, "note": note or ""},
        )

    def _quiz(self, viewer: str, topic: str) -> Any:
        from tv_agent_kit import CompanionAction, CompanionReply, Quiz

        entry = next((e for e in _load_catalog() if e["title"].lower() == topic.lower()), None)
        questions: List[Dict[str, Any]] = []
        if entry:
            year = int(entry["year"])
            questions.append({
                "id": "q1",
                "question": f"What year did {topic} start?",
                "options": [str(year), str(year + 3), str(year - 4), str(year + 7)],
                "correct_index": 0,
                "explanation": f"It started in {year}.",
            })
            real_genre = entry["genres"][0]
            dummies = [g for g in _GENRES if g != real_genre][:3]
            questions.append({
                "id": "q2",
                "question": f"Which genre fits {topic} best?",
                "options": [real_genre] + dummies,
                "correct_index": 0,
                "explanation": f"It's a {entry['genres'][0].lower()}.",
            })
            questions.append({
                "id": "q3",
                "question": f"In one line, what's the premise of {topic}?",
                "options": [entry["premise"]] + [
                    "A comedy about office politics on the moon.",
                    "A detective series set in Victorian Paris.",
                    "A cooking competition between rival islands.",
                ],
                "correct_index": 0,
                "explanation": "That's the logline — roughly.",
            })
        else:
            questions = [
                {"id": "q1", "question": f"Which is most associated with {topic}?",
                 "options": [f"{topic} fan", "A rival fanbase", "Cameos only", "A sequel plotline"],
                 "correct_index": 0, "explanation": "Demo question."},
                {"id": "q2", "question": f"Best way to start with {topic}?",
                 "options": ["From the beginning", "Mid-season", "Only the finale", "The spin-off first"],
                 "correct_index": 0, "explanation": "Demo question."},
                {"id": "q3", "question": f"{topic} is best enjoyed…",
                 "options": ["With friends", "Alone in silence", "On mute", "Backwards"],
                 "correct_index": 0, "explanation": "Demo question."},
            ]
        self._quizzes[viewer] = {q["id"]: q["options"][q["correct_index"]] for q in questions}
        return CompanionReply(
            kind=CompanionAction.QUIZ,
            text=f"Pop quiz: {topic} — 3 questions. Let's go! (demo)",
            quiz=Quiz(topic=topic, difficulty="medium", questions=questions),
        )

    def _grade(self, viewer: str, rest: str) -> Any:
        from tv_agent_kit import CompanionAction, CompanionReply

        m = re.search(r"question\s+(\S+)\s+with:\s*(.+)$", rest)
        qid = m.group(1).strip() if m else "q?"
        choice = (m.group(2).strip() if m else "")
        bank = self._quizzes.get(viewer, {})
        correct_opt = bank.get(qid)
        if correct_opt is None:
            return CompanionReply(
                kind=CompanionAction.QUIZ_RESULT,
                text="Demo mode: no active quiz stored — start one first!",
                quiz_result={"correct": False, "correct_answer": correct_opt, "explanation": ""},
            )
        ok = choice.strip().lower() == correct_opt.lower() or choice.strip().lower() == f"{correct_opt[0]}"
        return CompanionReply(
            kind=CompanionAction.QUIZ_RESULT,
            text=("Nailed it! ✅ (demo)" if ok else f"Not quite — it's {correct_opt}. (demo)"),
            quiz_result={
                "correct": ok,
                "correct_answer": correct_opt,
                "explanation": "Graded locally in demo mode — the real agent grades via Bedrock.",
            },
        )

    def _explain(self, topic: str, level: str) -> Any:
        from tv_agent_kit import CompanionAction, CompanionReply

        key = topic.lower()
        hit = next(((k, v) for k, v in _EXPLAIN_BANK.items() if k in key or key in k), None)
        core, full = (hit[1] if hit else (f"{topic}, in simple terms, is a thing worth knowing.",
                                          f"{topic} is best understood through its core mechanics — in demo mode we keep it short."))
        if level == "kid":
            text = f"{core} (Kid mode demo: one fun fact — you just leveled up your couch-knowledge.)"
        elif level == "deep":
            text = f"{full} Deep dive (demo): the key terms and why it matters — {topic} connects to the broader story you're watching."
        else:
            text = full
        return CompanionReply(kind=CompanionAction.EXPLAIN, level=level, text=f"[demo] {text}")

    def _discussion(self, title: str) -> Any:
        from tv_agent_kit import CompanionAction, CompanionReply

        return CompanionReply(
            kind=CompanionAction.DISCUSSION,
            text=f"Between-episode fuel for {title} (demo prompts):",
            sections=[{"heading": f"{i + 1}.", "body": p} for i, p in enumerate(_DISCUSSION)],
        )

    def _briefing(self, title: str) -> Any:
        from tv_agent_kit import CompanionAction, CompanionReply

        entry = next((e for e in _load_catalog() if e["title"].lower() == title.lower()), None)
        if entry:
            sections = [
                {"heading": "Premise", "body": entry["premise"]},
                {"heading": "Why it's being talked about", "body": f"{entry['known_for']} — and the conversation hasn't stopped since {entry['year']}."},
                {"heading": "Know before you watch", "body": f"Genres: {', '.join(entry['genres'])}. Start anywhere you like, but the first episode sets the rules."},
                {"heading": "Watch-along tips", "body": "Keep ReelMind open for spoiler-safe questions. Set your progress so we lock spoilers."},
            ]
            text = f"Your {title} briefing is ready (demo data)."
        else:
            sections = [
                {"heading": "Premise", "body": f"Demo mode: I don't have curated notes for {title} yet — connect Bedrock for the real thing."},
                {"heading": "Tell me", "body": "In one line, what's it about? I'll tailor the briefing and keep spoilers locked."},
            ]
            text = f"Quick briefing for {title} (demo — limited notes)."
        return CompanionReply(
            kind=CompanionAction.BRIEFING,
            text=text,
            sections=sections,
        )
