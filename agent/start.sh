#!/usr/bin/env bash
# ReelMind agent — one-shot launcher.
#
#   ./start.sh            # real mode: Amazon Bedrock (needs aws configure)
#   ./start.sh demo       # demo mode: offline canned answers (no AWS needed)
#
# Env overrides: PORT (default 8000), REGION, MODEL, FAST_MODEL, COMPANION_API_KEY
set -euo pipefail
cd "$(dirname "$0")"

MODE="${1:-real}"
if [ ! -d .venv ]; then
  python3 -m venv .venv
  ./.venv/bin/pip install --quiet --upgrade pip
fi
# shellcheck disable=SC1091
source .venv/bin/activate
pip install --quiet -r requirements.txt

if [ "$MODE" = "demo" ]; then
  export DEMO_MODE=1
fi

exec python -m reelmind_agent.main
