#!/usr/bin/env bash
# Day-0 AWS verification for ReelMind (run on the dev machine, ~5 min).
#
#   ./day0-check.sh [region]     # default: aws configure default region
#
# Exits 0 when a usable Bedrock setup is found; prints the exact env vars
# to use for the agent when models live elsewhere.
set -uo pipefail

REGION="${1:-$(aws configure get region 2>/dev/null || true)}"
fail=0
say()  { printf '\n\033[1;33m== %s ==\033[0m\n' "$*"; }
ok()   { printf '  \033[1;32mOK\033[0m %s\n' "$*"; }
bad()  { printf '  \033[1;31mFAIL\033[0m %s\n' "$*"; fail=1; }
info() { printf '  %s\n' "$*"; }

say "1. AWS credentials"
if aws sts get-caller-identity >/dev/null 2>&1; then
  ok "aws sts get-caller-identity: $(aws sts get-caller-identity --query 'Account' --output text 2>/dev/null)"
else
  bad "AWS credentials not configured. Run: aws configure"
  info "Everything below will fail until then. (Demo mode still works: ./start.sh demo)"
fi

if [ -z "${REGION:-}" ]; then
  bad "No region found. Pass one: ./day0-check.sh ap-south-1 (or us-east-1, ...)"
  exit 1
fi
info "Region under test: $REGION"

say "2. Bedrock Claude models in $REGION"
MODELS=$(aws bedrock list-foundation-models --region "$REGION" \
  --query 'modelSummaries[?contains(modelId, `claude`)].modelId' --output text 2>/dev/null || true)
if [ -n "$MODELS" ]; then
  ok "Claude models available:"
  # shellcheck disable=SC2086
  for m in $MODELS; do info "    $m"; done
  if echo "$MODELS" | grep -qi "sonnet"; then ok "reasoning model (sonnet) present"; else bad "no sonnet model — check MODEL env var"; fi
  if echo "$MODELS" | grep -qi "haiku";  then ok "fast model (haiku) present";       else bad "no haiku model — check FAST_MODEL env var"; fi
else
  bad "No Claude models in $REGION (Bedrock not enabled, or region unsupported)."
  info "Try: ./day0-check.sh us-east-1   (deploy the agent there; the TV just needs the URL)"
fi

say "3. Amazon Bedrock AgentCore in $REGION"
if aws bedrock-agentcore-control list-agents --region "$REGION" >/dev/null 2>&1; then
  ok "AgentCore API reachable in $REGION → AGENTCORE=1 deployment available"
else
  info "AgentCore not reachable in $REGION (not enabled / not in this region)."
  info "Non-blocking: the default FastAPI mode still counts for the AWS Builder mini."
fi

say "4. Network egress from this machine (Bedrock data plane)"
if python3 - <<'PY' 2>/dev/null
import socket
socket.setdefaulttimeout(5)
socket.create_connection(("bedrock-runtime.$REGION.amazonaws.com", 443))
PY
then
  ok "bedrock-runtime.$REGION.amazonaws.com:443 reachable"
else
  bad "cannot reach bedrock-runtime.$REGION.amazonaws.com:443 (VPN/corporate proxy?)"
fi

say "Result"
if [ "$fail" -eq 0 ]; then
  ok "Agent can run in real mode in $REGION:"
  echo "    REGION=$REGION python -m reelmind_agent.main"
else
  info "Fix the FAIL items above — or develop now in demo mode:"
  echo "    ./start.sh demo"
fi
exit "$fail"
