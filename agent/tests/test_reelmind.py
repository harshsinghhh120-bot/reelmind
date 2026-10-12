"""Offline unit tests for the ReelMind agent (no AWS, no network).

Run from this directory:  python -m unittest tests.test_reelmind -v
"""

from __future__ import annotations

import json
import os
import sys
import tempfile
import unittest

_HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(_HERE))  # reelmind/agent
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(_HERE))), "tv-agent-quickstart"))

from reelmind_agent.main import build_agent  # noqa: E402
from reelmind_agent.tools import build_tools, normalize_quiz_answer, spoiler_status  # noqa: E402
from tv_agent_kit import CompanionAction, FakeLLMClient, LocalMemoryStore, parse_reply  # noqa: E402

VALID_QUIZ = json.dumps(
    {
        "topic": "The Bear",
        "difficulty": "medium",
        "questions": [
            {"id": "q1", "question": "What city is the restaurant in?", "options": ["Chicago", "NYC", "LA", "Boston"], "correct_index": 0, "explanation": "It's a Chicago sandwich shop."},
            {"id": "q2", "question": "What is the shop called?", "options": ["The Beef", "The Bear", "The Boar", "The Barn"], "correct_index": 1, "explanation": "The Bear."},
            {"id": "q3", "question": "What does Carmy previously cook?", "options": ["Fusion", "Fine dining", "BBQ", "Sushi"], "correct_index": 1, "explanation": "A Michelin-starred kitchen."},
        ],
    }
)


def _fake_llm(system: str, user: str, kwargs: dict) -> str:
    if user.startswith("Topic:") and "questions" in user:
        return VALID_QUIZ
    if user.startswith("Show:"):
        return json.dumps({"prompts": ["Would you rather?", "What moment stuck with you?", "What do you predict next?"]})
    if user.startswith("Topic:"):  # explain
        return json.dumps({"text": "A friendly explanation."})
    if user.startswith("Question:"):  # adjudication
        return json.dumps({"correct": False, "why": "Close, but not the right option."})
    return json.dumps({"text": "fallback"})


class _ToolsBase(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.NamedTemporaryFile(suffix=".json", delete=False)
        self.tmp.close()
        os.unlink(self.tmp.name)
        self.memory = LocalMemoryStore(self.tmp.name)
        self.calls = []
        self.llm = FakeLLMClient(_fake_llm, record=self.calls)
        self.tools = {t.__name__: t for t in build_tools(self.memory, self.llm, fast_model="fast-model")}

    def tearDown(self):
        if os.path.exists(self.tmp.name):
            os.unlink(self.tmp.name)


class TestPureHelpers(unittest.TestCase):
    def test_spoiler_status_with_progress(self):
        s = spoiler_status({"the bear": {"title": "The Bear", "season": 2, "episode": 8}}, "The Bear")
        self.assertIn("S2E8", s)

    def test_spoiler_status_without(self):
        self.assertIn("no stored progress", spoiler_status({}, "Dark"))

    def test_grade_exact(self):
        self.assertTrue(normalize_quiz_answer(["Chicago", "NYC", "LA", "Boston"], 0, "Chicago"))

    def test_grade_letter(self):
        self.assertFalse(normalize_quiz_answer(["Chicago", "NYC", "LA", "Boston"], 0, "b"))
        self.assertTrue(normalize_quiz_answer(["Chicago", "NYC", "LA", "Boston"], 0, "a"))

    def test_grade_number(self):
        self.assertTrue(normalize_quiz_answer(["a", "b", "c", "d"], 2, "3"))

    def test_grade_wrong_option_verbatim(self):
        self.assertFalse(normalize_quiz_answer(["Chicago", "NYC", "LA", "Boston"], 0, "NYC"))

    def test_grade_freetext_needs_adjudication(self):
        self.assertIsNone(normalize_quiz_answer(["Chicago", "NYC", "LA", "Boston"], 0, "the big windy city"))


class TestTools(_ToolsBase):
    def test_set_progress(self):
        out = parse_reply(self.tools["set_progress"]("v1", "The Bear", 2, 8))
        self.assertEqual(out.kind, CompanionAction.PROGRESS_UPDATE)
        self.assertEqual(self.memory.get_progress("v1", "The Bear")["episode"], 8)

    def test_get_progress_empty_then_set(self):
        out = parse_reply(self.tools["get_progress"]("v1"))
        self.assertEqual(out.kind, CompanionAction.ANSWER)
        self.tools["set_progress"]("v1", "Dark", 1, 3)
        out = parse_reply(self.tools["get_progress"]("v1"))
        self.assertIn("Dark", out.text)

    def test_generate_quiz(self):
        out = parse_reply(self.tools["generate_quiz"]("The Bear", "medium", 3))
        self.assertEqual(out.kind, CompanionAction.QUIZ)
        self.assertEqual(len(out.quiz.questions), 3)
        for q in out.quiz.questions:
            self.assertEqual(len(q.options), 4)
        self.assertTrue(self.calls and self.calls[0]["model"] == "fast-model")

    def test_grade_correct_deterministic(self):
        q = json.loads(VALID_QUIZ)["questions"][0]
        out = parse_reply(self.tools["grade_quiz_answer"](q["question"], q["options"], q["correct_index"], "Chicago"))
        self.assertEqual(out.kind, CompanionAction.QUIZ_RESULT)
        self.assertTrue(out.quiz_result["correct"])
        self.assertEqual(self.calls, [])  # deterministic path: no LLM call

    def test_grade_freetext_adjudicated(self):
        q = json.loads(VALID_QUIZ)["questions"][0]
        out = parse_reply(self.tools["grade_quiz_answer"](q["question"], q["options"], q["correct_index"], "the windy city"))
        self.assertFalse(out.quiz_result["correct"])
        self.assertIn("close", out.quiz_result["explanation"].casefold())

    def test_explain_kid_mode(self):
        out = parse_reply(self.tools["explain_topic"]("short selling", "kid"))
        self.assertEqual(out.kind, CompanionAction.EXPLAIN)
        self.assertEqual(out.level, "kid")
        self.assertTrue(out.text)

    def test_explain_bad_level_defaults_standard(self):
        out = parse_reply(self.tools["explain_topic"]("short selling", "wizard"))
        self.assertEqual(out.level, "standard")

    def test_suggest_discussion(self):
        out = parse_reply(self.tools["suggest_discussion"]("The Bear", 2, 8))
        self.assertEqual(out.kind, CompanionAction.DISCUSSION)
        self.assertEqual(len(out.sections), 3)


class TestBuildAgent(unittest.TestCase):
    def test_offline_build(self):
        path = tempfile.mktemp(suffix=".json")
        agent, memory = build_agent(llm=FakeLLMClient(_fake_llm), memory=LocalMemoryStore(path))
        if os.path.exists(path):
            os.unlink(path)
        self.assertEqual(agent.name, "reelmind-companion")
        self.assertEqual(len(agent._tools), 6)
        # Without strands installed the agent degrades to a clear error reply,
        # never an exception:
        if agent._agent is None:
            r = agent.ask("v1", "hi", state={})
            self.assertEqual(r.kind, CompanionAction.ERROR)


if __name__ == "__main__":
    unittest.main(verbosity=2)
