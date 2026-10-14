#!/usr/bin/env bash
# ReelMind — one-shot bootstrap + full gate (what CI runs, locally).
#
# Usage: ./bootstrap.sh          (needs: python3 + pip, node 20+, git)
set -euo pipefail
cd "$(dirname "$0")"

echo "==> [1/4] Kit (tv-agent-quickstart) — clone if missing, install editable"
if [ ! -d tv-agent-quickstart ]; then
  git clone https://github.com/harshsinghhh120-bot/tv-agent-quickstart.git
fi
python3 -m pip install --quiet -e tv-agent-quickstart

echo "==> [2/4] Agent deps + unit tests"
cd agent
python3 -m pip install --quiet -r requirements.txt
python3 -m pytest -q
cd ..

echo "==> [3/4] Agent E2E (demo mode, spawns its own server — 15 checks)"
(cd agent && python3 e2e_demo_check.py)

echo "==> [4/4] Client: npm install + tsc + jest"
cd client
npm install --no-audit --no-fund
npm run typecheck
npm test
cd ..

echo
echo "ALL GREEN ✔ — next: docs/day1-device-runbook.md (device build + voice)"
