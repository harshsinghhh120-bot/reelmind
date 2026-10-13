# Day 2 — Deploy the agent to AWS Bedrock AgentCore Runtime

**Goal:** the agent runs serverless on AWS (no always-on PC); the TV app
points `agentUrl` at the AgentCore Runtime invoke URL and authenticates with a
short-lived Cognito bearer token. The LAN-PC agent stays the demo fallback —
same code, same contract.

> Costs: AgentCore Runtime is pay-per-invocation (idle costs nothing),
> Cognito free tier covers the hackathon. Tear down after with
> `agentcore remove agent reelmind-agent && agentcore deploy` or the CloudWatch
> console if you want the bill at $0.

## Why container build, not CodeZip

`agent/requirements.txt` pulls the kit as a **local editable** dependency
(`-e ../../tv-agent-quickstart`). CodeZip zips only the agent directory and
would break on that relative path. The **Container** build type copies the
whole repo layout and installs everything in the image — matches how we run it
everywhere else.

## 0. Prereqs

- AWS CLI v2 configured (the `reelmind` profile from `day0-check.sh` works)
- Node ≥ 20 (AgentCore CLI is an npm package)
- Docker (for `--local` builds; cloud build via CodeBuild works without it)

```bash
npm install -g @aws/agentcore        # AgentCore CLI
cd reelmind/agent
```

## 1. Dockerfile

```dockerfile
# agent/Dockerfile
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim
WORKDIR /app
ENV UV_SYSTEM_PYTHON=1 UV_COMPILE_BYTECODE=1

COPY ../tv-agent-quickstart/requirements.txt /tmp/kit-requirements.txt
COPY . /app/

RUN uv pip install -r /tmp/kit-requirements.txt \
 && uv pip install -r requirements.txt --no-editable \
 && rm -rf ../tv-agent-quickstart

EXPOSE 8080
CMD ["uvicorn", "reelmind_agent.main:app", "--host", "0.0.0.0", "--port", "8080"]
```

Notes:
- The agent's `requirements.txt` has `-e ../../tv-agent-quickstart` — in the
  image we install the kit from its own `requirements.txt` and install the
  agent deps with `--no-editable` (replaces the editable path with the
  already-installed kit). If the editable line still trips the resolver,
  keep a second file `agent/requirements-docker.txt` = the same lines minus
  the `-e` line, and point the Dockerfile at it. **This line is the one thing
  to verify live — 5 minutes of fiddling, not architecture.**
- AgentCore Runtime calls the app on **8080**; set `HOST=0.0.0.0`/`PORT=8080`
  in the container (uvicorn args above).

## 2. Configure + deploy

```bash
# from reelmind/agent, region from day0-check.sh (e.g. ap-south-1 or us-west-2)
agentcore configure --name reelmind-agent
#   → build type: Container
#   → execution role: auto-create (it needs Bedrock model access; day0's
#     IAM policy already grants bedrock:InvokeModel on the profile user —
#     the role needs the same; copy the policy onto the auto-created role)
agentcore deploy --dry-run     # preview
agentcore deploy               # first deploy: CDK bootstrap, few minutes
agentcore status               # runtime ARN + endpoint
```

Record the **runtime ARN** (`arn:aws:bedrock-agentcore:<region>:<acct>:runtime/reelmind-agent-…`).
Invoke URL shape:

```
https://bedrock-agentcore.<region>.amazonaws.com/runtimes/<url-encoded ARN>/invocations?qualifier=DEFAULT
```

## 3. Inbound auth for the TV app (the non-obvious part)

AgentCore Runtime's default authorizer is **IAM (SigV4)** — a Fire TV debug
app can't sign SigV4. The supported alternative is a **CUSTOM_JWT
authorizer** backed by Cognito:

```bash
# 1) Cognito user pool + public client + one device user (scripted below)
export REGION=<your region>
export POOL_ID=$(aws cognito-idp create-user-pool \
  --pool-name reelmind-dev \
  --policies '{"PasswordPolicy":{"MinimumLength":8}}' \
  --region $REGION | jq -r '.UserPool.Id')
export CLIENT_ID=$(aws cognito-idp create-user-pool-client \
  --user-pool-id $POOL_ID --client-name reelmind-tv --no-generate-secret \
  --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH \
  --region $REGION | jq -r '.UserPoolClient.ClientId')
aws cognito-idp admin-create-user --user-pool-id $POOL_ID --username tv \
  --region $REGION --message-action SUPPRESS
aws cognito-idp admin-set-user-password --user-pool-id $POOL_ID \
  --username tv --password "change-me-please" --region $REGION --permanent

# 2) (required for token endpoint / discovery) custom domain
aws cognito-idp create-user-pool-domain --user-pool-id $POOL_ID \
  --domain reelmind-dev-$RANDOM --region $REGION

# 3) re-deploy the agent with the JWT authorizer
agentcore add agent \
  --name reelmind-agent \
  --language Python --framework Strands --model-provider Bedrock --memory none \
  --authorizer-type CUSTOM_JWT \
  --discovery-url "https://cognito-idp.$REGION.amazonaws.com/$POOL_ID/.well-known/openid-configuration" \
  --allowed-clients "$CLIENT_ID" \
  --request-header-allowlist Authorization
agentcore deploy
```

### Client changes (small, sketched)

`client/lib/api.ts` gains one fetch before the first request:

```ts
// Cognito query protocol (NOT the /login hosted-UI endpoint):
const tokenUrl = `https://cognito-idp.${REGION}.amazonaws.com/`;
// POST form: Action=InitiateAuth&Version=2011-07-19
//   &ClientId=${CLIENT_ID}&AuthFlow=USER_PASSWORD_AUTH
//   &AuthParameters={"USERNAME":"tv","PASSWORD":"..."}
// → AccessToken (3600 s) → header: Authorization: Bearer <token>
// → also send X-Amzn-Trace-Id (uuid) and
//   X-Amzn-Bedrock-AgentCore-Runtime-Session-Id (per-conversation uuid)
// → agentUrl becomes the invoke URL above
```

Token lifetime is 1 h — refresh on 401. Hardcoding the device user's
credentials in a *debug/hackathon* build is acceptable; note it in the
submission (and swap for proper Cognito auth in the OSS-mini).

## 4. Verify without the TV

```bash
TOKEN=$(aws cognito-idp initiate-auth --client-id $CLIENT_ID \
  --auth-flow USER_PASSWORD_AUTH \
  --auth-parameters USERNAME=tv,PASSWORD='change-me-please' \
  --region $REGION | jq -r '.AuthenticationResult.AccessToken')

curl -X POST "$INVOKE_URL" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Amzn-Trace-Id: $(uuidgen)" \
  -H "X-Amzn-Bedrock-AgentCore-Runtime-Session-Id: demo-1" \
  -H "Content-Type: application/json" \
  -d '{"message":"What is a black hole?","progress":{}}'
```

Expect the same `CompanionReply` JSON the LAN demo returns. If this works,
the TV app works with zero further changes (it's the same contract).

## 5. What this buys the submission

- "Serverless agent on AgentCore Runtime, pay-per-invocation" is a concrete
  AWS Builder rubric hit (multi-service: Bedrock + Strands + AgentCore).
- The demo can even run with **no PC on the LAN** — stick + AWS only.
- If any step stalls (domain propagation, role permissions), the demo
  already works in demo mode on-LAN; this is a bonus track, not the
  critical path. Spend ≤ 2 h on it.
