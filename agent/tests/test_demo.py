"""Offline tests for ReelMind demo mode (no AWS, no network)."""

from __future__ import annotations

import json
import os
import sys
import unittest

_HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(_HERE))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(_HERE))), "tv-agent-quickstart"))

from reelmind_agent.demo import DemoLLMClient  # noqa: E402
from reelmind_agent.main import build_agent  # noqa: E402
from tv_agent_kit import CompanionAction, LocalMemoryStore, parse_reply  # noqa: E402

USER = 'Viewer: v1.\nStored viewer state (JSON):\n{{}}\n\nUser message: {msg}'


def card(msg: str) -> "object":
    return parse_reply(DemoLLMClient().complete("SYS", USER.format(msg=msg)))


class TestDemoClient(unittest.TestCase):
    def test_briefing_known_title(self):
        r = card("What's this: The Bear? Give me the briefing.")
        self.assertEqual(r.kind, CompanionAction.BRIEFING)
        heads = [s.heading for s in (r.sections or [])]
        self.assertIn("Premise", heads)

    def test_briefing_unknown_title(self):
        r = card("What's this: Some Obscure Indie Film?")
        self.assertEqual(r.kind, CompanionAction.BRIEFING)
        self.assertTrue(r.text)

    def test_progress(self):
        r = card("About The Bear: I'm on S2E8 of The Bear")
        self.assertEqual(r.kind, CompanionAction.PROGRESS_UPDATE)
        self.assertEqual((r.progress.season, r.progress.episode), (2, 8))
        self.assertEqual(r.progress.title, "The Bear")

    def test_progress_at_end(self):
        r = card("About Dark: I'm at the end of Dark")
        self.assertEqual(r.kind, CompanionAction.PROGRESS_UPDATE)
        self.assertGreaterEqual(r.progress.season, 99)

    def test_quiz_then_grade_correct(self):
        client = DemoLLMClient()
        quiz = parse_reply(client.complete("SYS", USER.format(msg="About The Bear: Give me a pop quiz about this!")))
        self.assertEqual(quiz.kind, CompanionAction.QUIZ)
        q = quiz.quiz.questions[0]
        graded = parse_reply(
            client.complete(
                "SYS",
                USER.format(msg=f"About The Bear: [structured] The viewer answered question {q.id} with: {q.options[q.correct_index]}"),
            )
        )
        self.assertEqual(graded.kind, CompanionAction.QUIZ_RESULT)
        self.assertTrue(graded.quiz_result["correct"])

    def test_quiz_grade_wrong(self):
        client = DemoLLMClient()
        quiz = parse_reply(client.complete("SYS", USER.format(msg="Pop quiz about Shogun!")))
        q = quiz.quiz.questions[0]
        wrong = next(o for o in q.options if o != q.options[q.correct_index])
        graded = parse_reply(
            client.complete(
                "SYS",
                USER.format(msg=f"[structured] The viewer answered question {q.id} with: {wrong}"),
            )
        )
        self.assertFalse(graded.quiz_result["correct"])

    def test_explain_levels(self):
        r_kid = card("Explain The stock market (kid)")
        r_deep = card("Explain The stock market (deep)")
        self.assertEqual(r_kid.kind, CompanionAction.EXPLAIN)
        self.assertEqual(r_kid.level, "kid")
        self.assertEqual(r_deep.level, "deep")
        self.assertNotEqual(r_kid.text, r_deep.text)

    def test_discussion(self):
        r = card("About Ted Lasso: Any discussion prompts?")
        self.assertEqual(r.kind, CompanionAction.DISCUSSION)
        self.assertEqual(len(r.sections), 3)

    def test_fallback_is_honest(self):
        r = card("Why did that happen?")
        self.assertEqual(r.kind, CompanionAction.ANSWER)
        self.assertIn("Demo mode", r.text)

    def test_all_cards_json_serializable(self):
        for msg in (
            "What's this: Severance?",
            "I'm on S1E4 of Severance",
            "Pop quiz about Severance!",
            "Explain Quantum entanglement (standard)",
            "Discussion prompts for Severance",
            "mystery question",
        ):
            wire = json.loads(DemoLLMClient().complete("SYS", USER.format(msg=msg)))
            self.assertIn("kind", wire)


class TestBuildAgentDemo(unittest.TestCase):
    def test_demo_agent_builds_and_answers(self):
        import tempfile

        path = tempfile.mktemp(suffix=".json")
        agent, memory = build_agent(llm=DemoLLMClient(), memory=LocalMemoryStore(path), simple=True)
        self.assertTrue(agent.simple)
        r = agent.ask("v1", "About The Bear: I'm on S2E8 of The Bear", state={})
        self.assertEqual(r.kind, CompanionAction.PROGRESS_UPDATE)
        if os.path.exists(path):
            os.unlink(path)


if __name__ == "__main__":
    unittest.main(verbosity=2)
