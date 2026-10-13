#!/usr/bin/env python3
"""ReelMind demo-mode end-to-end check.

Boots the agent in DEMO_MODE on a scratch port/state file, drives the exact
request sequence the TV client sends, and verifies the CompanionReply wire
protocol + memory persistence. 13 checks, no AWS, no network.

Usage:
    cd agent && python e2e_demo_check.py          # boots + checks + stops
    python e2e_demo_check.py --url http://host:port   # check a running server
"""

from __future__ import annotations

import json
import os
import signal
import socket
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request

CHECKS: list[tuple[str, bool, str]] = []


def check(label: str, cond: bool, detail: str = "") -> None:
    CHECKS.append((label, bool(cond), detail))
    print(f"{'PASS' if cond else 'FAIL'}  {label}" + (f"  [{detail}]" if detail and not cond else ""))


def http_post(url: str, payload: dict, timeout: float = 15.0) -> dict:
    req = urllib.request.Request(
        url, data=json.dumps(payload).encode(), headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.load(r)


def http_get(url: str, timeout: float = 10.0) -> dict:
    with urllib.request.urlopen(url, timeout=timeout) as r:
        return json.load(r)


def run_checks(base: str, state_file: str | None) -> bool:
    v = "e2e-checker"

    def chat(message: str, action: str | None = None, payload: dict | None = None) -> dict:
        return http_post(
            f"{base}/chat", {"viewer_id": v, "message": message, "action": action, "payload": payload}
        )

    # 1. health
    h = http_get(f"{base}/health")
    check("health", h.get("status") == "ok" and h.get("agent") == "reelmind-companion", str(h))

    # 2. briefing
    r = chat("What's this: The Bear? Give me the briefing.")
    heads = [s.get("heading") for s in r.get("sections", [])]
    check("briefing.kind", r.get("kind") == "briefing", str(r.get("kind")))
    check(
        "briefing.title",
        "The Bear" in r.get("text", "") and "Give me" not in r.get("text", ""),
        r.get("text", "")[:60],
    )
    check("briefing.sections", heads[:2] == ["Premise", "Why it's being talked about"], str(heads))

    # 3. progress + 4. memory persistence
    r = chat("About The Bear: I'm on S2E8 of The Bear")
    p = r.get("progress", {})
    check(
        "progress",
        r.get("kind") == "progress_update" and p.get("title") == "The Bear" and p.get("episode") == 8,
        str(p),
    )
    if state_file and os.path.exists(state_file):
        state = json.load(open(state_file))
        prog = state.get(v, {}).get("progress", {}).get("the bear", {})
        check("memory.persisted", prog.get("episode") == 8, str(state.get(v)))
    else:
        check("memory.persisted", False, "state file not readable")

    # 5. Q&A (demo canned answer)
    r = chat("About The Bear: Why did that happen?")
    check("ask", r.get("kind") == "answer" and "Demo mode" in r.get("text", ""), r.get("text", "")[:60])

    # 6-8. quiz generate + grade correct/wrong
    r = chat("Pop quiz about The Bear! 3 questions, medium.")
    quiz = r.get("quiz", {})
    qs = quiz.get("questions", [])
    check("quiz.topic", quiz.get("topic") == "The Bear" and len(qs) == 3, str(quiz.get("topic")))
    q1 = qs[0]
    correct_opt = q1["options"][q1["correct_index"]]
    r = chat(f'Quiz answer for "{q1["question"]}"', "quiz_answer", {"question_id": q1["id"], "choice": correct_opt})
    check("quiz.correct", r.get("kind") == "quiz_result" and r.get("quiz_result", {}).get("correct") is True)
    wrong_opt = next(o for o in q1["options"] if o != correct_opt)
    r = chat(f'Quiz answer for "{q1["question"]}"', "quiz_answer", {"question_id": q1["id"], "choice": wrong_opt})
    check("quiz.wrong", r.get("quiz_result", {}).get("correct") is False)

    # 9-10. explain levels
    rk = chat("Explain Quantum entanglement (kid)")
    rd = chat("Explain Quantum entanglement (deep)")
    check("explain.kid", rk.get("kind") == "explain" and rk.get("level") == "kid")
    check("explain.levels-differ", rk.get("text") != rd.get("text"))

    # 11. discussion
    r = chat("About Ted Lasso: Any discussion prompts?")
    check(
        "discussion",
        r.get("kind") == "discussion" and len(r.get("sections", [])) == 3 and "Ted Lasso" in r.get("text", ""),
    )

    # 12. fallback honesty
    r = chat("mystery question")
    check("fallback", r.get("kind") == "answer" and "Demo mode" in r.get("text", ""))

    # 13. wire protocol: every reply JSON-safe with a known kind
    known = {"briefing", "answer", "quiz", "quiz_result", "explain", "discussion", "progress_update", "error"}
    ok = True
    for msg in (
        "What's this: Severance?",
        "I'm on S1E4 of Severance",
        "Pop quiz about Severance!",
        "Explain Nuclear fusion (standard)",
        "Discussion prompts for Severance",
        "mystery question",
    ):
        try:
            wire = chat(msg)
            json.loads(json.dumps(wire))
            ok = ok and wire.get("kind") in known
        except Exception:  # noqa: BLE001
            ok = False
    check("wire.protocol", ok)
    return ok


def free_port() -> int:
    s = socket.socket()
    s.bind(("127.0.0.1", 0))
    port = s.getsockname()[1]
    s.close()
    return port


def main() -> int:
    url = None
    if "--url" in sys.argv:
        url = sys.argv[sys.argv.index("--url") + 1].rstrip("/")
        state_file = None
    else:
        port = free_port()
        state_file = tempfile.mktemp(prefix="reelmind-e2e-", suffix=".json")
        env = dict(os.environ, DEMO_MODE="1", PORT=str(port), STATE_FILE=state_file)
        proc = subprocess.Popen(
            [sys.executable, "-m", "reelmind_agent.main"],
            cwd=os.path.dirname(os.path.abspath(__file__)),
            env=env,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        url = f"http://127.0.0.1:{port}"
        try:
            for _ in range(50):
                try:
                    http_get(f"{url}/health", timeout=1.0)
                    break
                except Exception:  # noqa: BLE001
                    time.sleep(0.2)
            ok = run_checks(url, state_file)
        finally:
            proc.send_signal(signal.SIGINT)
            try:
                proc.wait(timeout=10)
            except subprocess.TimeoutExpired:
                proc.kill()
        if state_file and os.path.exists(state_file):
            os.unlink(state_file)
        return 0 if ok else 1

    ok = run_checks(url, state_file)
    return 0 if ok else 1


if __name__ == "__main__":
    passed = sum(1 for _, c, _ in CHECKS)
    total = len(CHECKS)
    try:
        sys.exit(main())
    finally:
        if total:
            print(f"\n{passed}/{total} checks passed")
