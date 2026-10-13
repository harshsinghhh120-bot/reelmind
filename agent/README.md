# ReelMind agent

Python companion agent: **Strands Agents SDK** on **Amazon Bedrock**, built on the
open-source [`tv-agent-quickstart`](https://github.com/harshsinghhh120-bot/tv-agent-quickstart) kit.

## Run

```bash
./start.sh            # real mode: Amazon Bedrock (needs aws configure)
./start.sh demo       # demo mode: offline canned answers (no AWS needed)
```

… or manually:

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m reelmind_agent.main                 # real mode
DEMO_MODE=1 python -m reelmind_agent.main     # demo mode
```

Listens on `0.0.0.0:8000`. Env vars: `REGION`, `MODEL` (default
`anthropic.claude-sonnet-4-5`), `FAST_MODEL` (default `anthropic.claude-haiku-4-5`),
`COMPANION_API_KEY`, `STATE_FILE`, `PORT`, `AGENTCORE=1` (deploy to Amazon Bedrock
AgentCore instead of running FastAPI locally).

### Demo mode (no AWS required)

`DEMO_MODE=1` swaps Bedrock for a **deterministic offline stand-in LLM**
(`reelmind_agent/demo.py`) and runs the agent in the kit's *simple mode*.
The full stack — TV client → FastAPI → agent → CompanionReply cards → memory
persistence — behaves exactly like production (the card protocol is identical),
but answers are canned and labeled "(demo)". Use it to develop and dry-run the
TV app before (or without) AWS setup; it is a dev aid, not a feature.

Verified end-to-end in demo mode: briefing, progress set + persistence,
Q&A, quiz generation + grading (correct & wrong), kid/deep explain,
discussion prompts — 13/13 HTTP checks passing.

## API

```
POST /chat   {"viewer_id": "couch-1", "message": "...", "action": null | "quiz_answer", "payload": {…}}
             → CompanionReply JSON
GET  /health → {"status":"ok","agent":"reelmind-companion"}
```

`CompanionReply` kinds: `briefing | answer | quiz | quiz_result | explain |
discussion | progress_update | error` (see `tv_agent_kit/protocol.py`).

## Tools

| Tool | Model | Purpose |
|---|---|---|
| `set_progress` / `get_progress` | deterministic | per-viewer progress → spoiler law |
| `generate_quiz` | Haiku (JSON mode) | themed pop quizzes, 4 options each |
| `grade_quiz_answer` | deterministic → Haiku adjudication | grades A–D / text / free answers |
| `explain_topic` | Haiku (JSON mode) | kid / standard / deep explanations |
| `suggest_discussion` | Haiku (JSON mode) | watch-party prompts, spoiler-aware |

## Tests (no AWS needed)

```bash
python -m unittest tests.test_reelmind tests.test_demo -v   # 27 tests
```

Covers spoiler posture, deterministic quiz grading (incl. letter/number picks),
LLM adjudication path, explain levels, discussion prompts, memory persistence,
offline agent construction, and the full demo-mode client behavior. All model
calls go through an injectable `LLMClient` — tests use `FakeLLMClient` /
`DemoLLMClient`.

## Deploy to Amazon Bedrock AgentCore

```bash
pip install "tv-agent-quickstart[agentcore]"
AGENTCORE=1 python -m reelmind_agent.main
```

Wrapper: `tv_agent_kit/agentcore.py`. The client then points at the AgentCore
gateway URL (set `extra.agentUrl` in `client/app.json`).
