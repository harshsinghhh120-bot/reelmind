# 📺 ReelMind — an AI viewing companion for the living room

**Fire TV track · Build, Ship, Shape: Amazon Developer Hackathon (Oct 2026)**

Say a show title into the Alexa remote, or tap it on screen: ReelMind gives you an
AI **briefing**, answers questions **spoiler-safe against your personal progress**,
runs **AI pop quizzes**, explains any concept in **kid / standard / deep** mode, and
generates **watch-party discussion prompts** between episodes.

- **Track:** Fire TV (runs on Fire OS; Vega-ready code path documented)
- **Priority categories:** AI-enhanced viewing · Multi-modal UX (voice + D-pad + touch) · Family entertainment
- **Mini challenges:** AWS Builder · Open Source

---

## Architecture

```
┌────────────────────────────────┐   POST /chat (JSON)    ┌────────────────────────────────────┐
│  Fire TV — React Native app    │ ──────────────────────► │  Python companion agent            │
│  (Expo SDK 54, com.reelmind.app)│ ◄────────────────────── │  built on tv-agent-quickstart      │
│                                │    CompanionReply JSON  │                                    │
│  • D-pad / ENTER / BACK via    │                         │  • Strands Agents SDK (AWS)        │
│    reelmind-remote native mod  │                         │  • Amazon Bedrock:                 │
│  • Virtual focus system (TS)   │                         │      Sonnet (reasoning) +          │
│  • Voice via Fire OS custom    │                         │      Haiku (fast lane)             │
│    voice intent (Kotlin)       │                         │  • AgentCore Memory / runtime      │
└────────────────────────────────┘                         │  • FastAPI /chat + /health         │
                                                           └────────────────────────────────────┘
```

| Component | Location | Notes |
|---|---|---|
| TV client (React Native/Expo) | `client/` | Fire OS APK via `expo run:android` + ADB; Vega build path in `client/README.md` |
| Remote bridge (Kotlin) | `client/packages/reelmind-remote/` | D-pad/ENTER/BACK key events + voice-intent consumption |
| Companion agent (Python) | `agent/` | Strands agent, 6 tools, memory, HTTP server |
| **Open-source kit** | [`tv-agent-quickstart`](https://github.com/<YOUR_GITHUB>/tv-agent-quickstart) (separate repo) | This agent `pip install`s it and runs on it at runtime |

### The agent's six tools

`set_progress` · `get_progress` · `generate_quiz` · `grade_quiz_answer` ·
`explain_topic` · `suggest_discussion`

Every reply is validated into a fixed `CompanionReply` JSON protocol
(`briefing | answer | quiz | quiz_result | explain | discussion |
progress_update | error`) — the TV never has to guess what the model said.
Spoiler policy lives in the system prompt **and** is enforced by per-viewer
memory (progress per title) that is injected into every turn.

---

## Quickstart

### 0. Day-0 AWS verification (do this first, ~15 min)

1. `aws configure` with an account that has **Amazon Bedrock** access (Claude models).
2. Check model availability in your region:
   ```bash
   aws bedrock list-foundation-models --region <region> \
     --query 'modelSummaries[?contains(modelId, `claude`)].{m:modelId}' --output table
   ```
3. Check **Amazon Bedrock AgentCore** availability in your region
   (`aws bedrock-agentcore-control list-agents` or the console). If it's not
   available where your account lives, deploy AgentCore in `us-east-1` — or
   skip AgentCore entirely: the agent runs identically on plain FastAPI
   (this is the default mode; AgentCore is the upgrade path, documented below).
4. If your region lacks a model, set `MODEL`/`FAST_MODEL` env vars to available ids.

### 1. Run the agent

```bash
# from the repo root (kit repo cloned as a sibling)
cd agent
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt          # includes -e ../../tv-agent-quickstart
python -m reelmind_agent.main            # http://0.0.0.0:8000  (POST /chat, GET /health)
```

Smoke test:

```bash
curl -s localhost:8000/health
curl -s localhost:8000/chat -H 'Content-Type: application/json' \
  -d '{"viewer_id":"couch-1","message":"What'"'"'s this: The Bear? Give me the briefing."}'
```

Offline unit tests (no AWS needed):

```bash
cd agent && python -m unittest tests.test_reelmind -v        # 16 tests
cd ../tv-agent-quickstart && python -m unittest tests.test_kit -v   # 17 tests
```

### 2. Run the TV client on your Fire TV stick

1. **Same Wi-Fi network** as the machine running the agent.
2. Set the agent URL in `client/app.json`:
   ```json
   "extra": { "agentUrl": "http://<your-machine-LAN-IP>:8000", "viewerId": "couch-1" }
   ```
3. Enable developer options on the stick: *Settings → Device → Developer Options → ADB
   debugging + Install from unknown sources*; `adb connect <stick-ip>:5555`.
4. Build & install:
   ```bash
   cd client
   npm install
   npx expo prebuild --platform android
   npx expo run:android --device <stick-ip>:5555
   ```
   (Or use the Expo Go-style dev client flow; the native `reelmind-remote` module
   requires a dev-client build, not Expo Go.)
5. Launch **ReelMind**. Navigate with the remote; tap works too.

### 3. Enable voice (Fire OS Developer Options, ~10 min)

1. [Fire OS Developer Options](https://developer.amazon.com/apps-and-games/fire-tv) console →
   your app (com.reelmind.app) → **Voice control** → *Custom intents*.
2. Create a custom intent:
   - Action: `com.reelmind.app.ASK`
   - Sample utterances: “ask ReelMind”, “ask ReelMind {query}”
   - Map the `{query}` parameter to intent **extra** named `query`.
3. Submit/register the intent, then on the stick: **“OK Alexa, ask ReelMind — what is The Bear?”**
   The app launches (or comes to front) and the spoken text is consumed by the
   Kotlin bridge (`ReelMindRemoteModule.consumeLaunchIntentText()`).

### 4. Optional: deploy the agent to Amazon Bedrock AgentCore

```bash
cd agent
pip install "tv-agent-quickstart[agentcore]"
AGENTCORE=1 python -m reelmind_agent.main
```

This deploys the same Strands agent to AgentCore (managed runtime + memory +
gateway). Point the client's `agentUrl` at the AgentCore gateway endpoint.
If AgentCore isn't available in your region, the plain-FastAPI mode above is
functionally identical for the demo and still scores for AWS Builder (the
services are Bedrock + Strands + Kiro/ADBT).

---

## AWS integrations (AWS Builder mini challenge)

| AWS service | How it's used here | Where in the code |
|---|---|---|
| **Amazon Bedrock** | Claude Sonnet for companion turns & briefings; Claude Haiku for the “fast lane” (quiz generation, grading adjudication, explanations, prompts) via `converse` with `responseFormat: json` | `tv_agent_kit/llm.py` (`BedrockLLMClient`), `reelmind_agent/tools.py` |
| **Strands Agents SDK** | The companion agent itself — 6 Python `@tool`s, system-prompt policy, structured `CompanionReply` output | `tv_agent_kit/agent.py`, `reelmind_agent/main.py` |
| **Amazon Bedrock AgentCore** | Deployment target: managed runtime, per-viewer memory, gateway endpoint (optional mode) | `tv_agent_kit/agentcore.py`, `AGENTCORE=1` in `main.py` |
| **Kiro + ADBT MCP for AI** | Development tool used across the build: Kiro (with the *Amazon Devices Builder Tools* MCP server + Strands/AgentCore MCP servers) generated and reviewed the Fire TV client, the Kotlin remote bridge, and the agent wiring | See “Development workflow” below |

## Development workflow (what Kiro + ADBT actually did)

The Fire TV client was built with **Kiro** using Amazon's **ADBT (Amazon
Devices Builder Tools) MCP server + agent skills**, which give the agent
Fire TV domain context (D-pad navigation, focus management, 10-foot UI,
Fire OS vs Vega differences). Steering rules in the project:

- *When building anything Fire TV, consult ADBT doc search first.*
- *When building agents, use Strands + Bedrock; when deploying, use AgentCore.*

Friction encountered while using ADBT/Kiro is recorded in
[`submission/friction-log.md`](submission/friction-log.md).

## Open Source mini challenge

- **Kit repo:** [`tv-agent-quickstart`](https://github.com/<YOUR_GITHUB>/tv-agent-quickstart) —
  new Apache-2.0 project created during the hackathon window. This app
  `pip install`s it and runs on it at runtime (agent import chain:
  `reelmind_agent → tv_agent_kit`).
- **This repo:** MIT-licensed public repo; setup above is the full run path.
- Full details: [`submission/open-source.md`](submission/open-source.md).

## Repo layout

```
reelmind/
├── README.md                  ← you are here
├── LICENSE                    (MIT)
├── agent/                     Python companion agent (Strands + Bedrock + kit)
│   ├── reelmind_agent/        prompts, tools, catalog, main entry
│   ├── tests/                 16 offline unit tests
│   └── requirements.txt
├── client/                    React Native (Expo) Fire TV app
│   ├── App.tsx                navigation, keys, voice, flows
│   ├── lib/                   focus system, agent API client
│   ├── screens/               Home, Briefing, Ask, Quiz, Explain, WatchParty
│   ├── components/            Focusable, Chip, cards, badges
│   ├── packages/reelmind-remote/  Kotlin native bridge (keys + voice intent)
│   └── README.md              device setup, voice console, Vega notes
└── submission/                description, product feedback, friction log,
                               feature requests, open-source write-up, demo script
```

## Testing & status

- ✅ Agent: 33 offline unit tests (kit + ReelMind) passing; wire protocol validated
- ✅ Client: `tsc --noEmit` clean; Metro/Hermes bundle builds (Expo SDK 54, RN 0.81)
- ✅ On-device: demo video shows the app running on a Fire TV (see Devpost submission)
- Demo video: [link in the Devpost submission]

## License

MIT — see [LICENSE](LICENSE). The agent runtime is built on
[tv-agent-quickstart](https://github.com/<YOUR_GITHUB>/tv-agent-quickstart) (Apache-2.0).
