# ReelMind agent

Python companion agent: **Strands Agents SDK** on **Amazon Bedrock**, built on the
open-source [`tv-agent-quickstart`](https://github.com/<YOUR_GITHUB>/tv-agent-quickstart) kit.

## Run

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m reelmind_agent.main
```

Listens on `0.0.0.0:8000`. Env vars: `REGION`, `MODEL` (default
`anthropic.claude-sonnet-4-5`), `FAST_MODEL` (default `anthropic.claude-haiku-4-5`),
`COMPANION_API_KEY`, `STATE_FILE`, `PORT`, `AGENTCORE=1` (deploy to Amazon Bedrock
AgentCore instead of running FastAPI locally).

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
python -m unittest tests.test_reelmind -v
```

Covers spoiler posture, deterministic quiz grading (incl. letter/number picks),
LLM adjudication path, explain levels, discussion prompts, memory persistence,
and offline agent construction. All model calls go through an injectable
`LLMClient` — tests use `FakeLLMClient`.

## Deploy to Amazon Bedrock AgentCore

```bash
pip install "tv-agent-quickstart[agentcore]"
AGENTCORE=1 python -m reelmind_agent.main
```

Wrapper: `tv_agent_kit/agentcore.py`. The client then points at the AgentCore
gateway URL (set `extra.agentUrl` in `client/app.json`).
