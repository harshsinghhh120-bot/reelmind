#!/usr/bin/env python3
"""Seed a rich ReelMind demo state so on-device demos start warm.

Writes a `reelmind-state.json` (LocalMemoryStore format — built through the
kit's own memory API, so the shape is exactly what the agent reads) with a
coherent family watch history:

  viewer "couch-1" (the client's default viewerId):
    Shogun     S1E6  (~60% of season 1 — the "62%" spoiler-safe beat)
    The Bear   S2E8
    Severance  S1E9
    quizzes: 3 games, 7 of 9 correct

Usage:
  python3 seed_demo_state.py                    # ./reelmind-state.json
  python3 seed_demo_state.py --file /tmp/s.json --show
  python3 seed_demo_state.py --viewer couch-1

Then start the agent with that file:
  STATE_FILE=/tmp/s.json ./start.sh demo        # or: STATE_FILE=/tmp/s.json ./start.sh
"""

from __future__ import annotations

import argparse
import json
import os
import sys

from tv_agent_kit.memory import LocalMemoryStore

SEED = {
    "progress": [
        # (title, season, episode, note)
        ("Shogun", 1, 6, "Yoshii's crisis week"),
        ("The Bear", 2, 8, "Carmy's takeover"),
        ("Severance", 1, 9, "after the party"),
    ],
    "quizzes": {"games": 3, "answered": 9, "correct": 7},
}


def seed(viewer_id: str, path: str) -> dict:
    mem = LocalMemoryStore(path)
    for title, season, episode, note in SEED["progress"]:
        mem.set_progress(viewer_id, title, season, episode, note)
    mem.update(viewer_id, quizzes=SEED["quizzes"])
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--viewer", default="couch-1", help="viewer id (client default: couch-1)")
    ap.add_argument("--file", default="reelmind-state.json", help="state file path")
    ap.add_argument("--show", action="store_true", help="print the resulting state")
    args = ap.parse_args()

    state = seed(args.viewer, args.file)
    if args.show:
        print(json.dumps(state, indent=2, ensure_ascii=False))
    print(f"seeded viewer '{args.viewer}' -> {os.path.abspath(args.file)}")
    print(f"  progress: {', '.join(f'{t} S{s}E{e}' for t, s, e, _ in SEED['progress'])}")
    print(f"  quizzes : {SEED['quizzes']['correct']}/{SEED['quizzes']['answered']} over {SEED['quizzes']['games']} games")
    print("start with:  STATE_FILE=<that file> ./start.sh [demo]")
    return 0


if __name__ == "__main__":
    sys.exit(main())
