# Devpost submission draft — ReelMind (Build, Ship, Shape: Amazon Developer Hackathon)

> Fill these in on the Devpost form as-is or trim. Each field notes its target
> length. **Video must be < 3 min** and is the single most-weighted artifact —
> script + shot list in `demo-script.md`. Deadline: **Oct 23, 2026**.

---

## Project title

ReelMind

## Tagline (short description)

An AI viewing companion for the living room: says your show, gets a briefing,
asks spoiler-safe questions, quizzes the whole family — on Fire TV, by voice or
D-pad.

## What is it? (~400 chars)

ReelMind is a Fire TV app that sits next to whatever you're watching. Say a
show title into your Alexa remote (or tap it): you get an AI **briefing**,
can ask **spoiler-safe** questions against your *personal* progress, take
**AI pop quizzes** for the kids, ask it to explain any concept in
**kid / standard / deep** mode, and get **watch-party discussion prompts**
between episodes. One JSON contract from a Strands + Amazon Bedrock agent
drives every card on screen — and the same agent can run in demo mode with
zero AWS, which is how we tested end-to-end before a single device build.

## How it works (long)

**Client — Fire TV (React Native / Expo SDK 54, TV-first):**
- 10-foot dark UI with a *virtual focus system written in pure TypeScript*
  (nearest-node grid walk, same-lane preferred) — no external TV toolkit.
- A small Kotlin module (`reelmind-remote`) bridges the physical remote
  (D-pad/ENTER/BACK → JS events) and consumes the Fire OS **custom voice
  intent** (`com.reelmind.app.ASK`) so "Alexa, ask ReelMind…" re-launches the
  app with the spoken question already submitted.
- Ships as a debug APK built from Expo prebuild; a custom Expo config plugin
  writes the *exact* voice-intent action into the manifest (Expo's standard
  config prefixes actions, which breaks Fire OS's exact-match voice
  registration) and registers the native module explicitly — verified
  idempotent across prebuilds.

**Agent — Python companion (built on `tv-agent-quickstart`):**
- Strands Agents SDK on **Amazon Bedrock (Sonnet)** with a `progress` tool
  that fetches the viewer's watch state, so every answer is grounded in
  *your* progress, not the global spoiler database.
- Structured `CompanionReply` JSON (kind: ask | quiz | explain | briefing |
  watch_party | error) — the client renders one schema, not five.
- **Demo mode**: the same endpoints, same schema, canned offline answers.
  15/15 E2E checks pass with zero AWS — this is how the hackathon CI ran the
  whole product loop.
- **75 offline unit tests + 15-check E2E**, all green in GitHub Actions CI:
  agent 28 (16 core + 12 demo, incl. the demo-state seeder), kit 27,
  client 20 (focus grid-walker, API client contract incl. the 20 s abort,
  config, state helpers).

**Why this architecture:** the JSON contract means the TV app, the demo
agent, and a future AgentCore-deployed agent are interchangeable — we
developed and tested the entire UX offline, then flipped one env var to
point at real Bedrock.

## Tech stack

React Native, Expo SDK 54, TypeScript, Kotlin, React Native config plugin,
Strands Agents SDK (AWS), Amazon Bedrock (Sonnet), FastAPI/uvicorn,
python-docx (report artifacts), AWS AgentCore (deployment path), Fire OS
custom voice intents, ADB.

## What was built with Claude / agentic workflow (AWS Builder rubric)

- The entire client focus system + agent contract were scaffolded and
  iterated by an AI coding agent; humans directed, the agent wrote, tested,
  and self-reviewed (75 unit tests + 15 E2E checks, all green in CI).
- The Expo config plugin that fixes the voice-intent action prefixing was
  written after the agent diagnosed the generated manifest diff.
- Development workflow: agent-driven TDD loop (write → test → prebuild-verify
  → commit), day-0 AWS bootstrap scripted (`day0-check.sh`), day-1 device
  path runbooked (`docs/day1-device-runbook.md`) so a human can complete the
  hardware step in one sitting.

## Product feedback (audience, use-cases, what we learned)

**Target audience:** households that watch together — parents watching kids'
shows, couples with different progress, friend watch-parties. The TV is the
only screen in the room everyone shares, but no companion app is built for
*shared, asynchronous* viewing (you're on ep. 3, your partner on ep. 1, the
kid asks "what's a black hole" mid-scene).

**Top use-cases (ranked by demo traction):**
1. **Kid mode explain** — the single most-repeated reaction ("do it again
   but for my 7-year-old"). Three explanation levels from one concept.
2. **Spoiler-safe Ask** — progress-grounded answers change the *answer*, not
   just the tone: "what happens to X?" differs by who is asking.
3. **Watch-party prompts** — prompts that reference *both* parties'
   progress; zero-effort icebreaker.
4. **Quizzes** — works as a post-episode family game; scores keep replay
   value.

**What we learned (and will change):**
- *Voice-first beats touch-first on TV.* In every on-LAN demo, remote voice
  was the input people reached for; tap is the fallback. Day 2 adds VSK
  far-field ("Alexa…" from across the room) and hands-free follow-up.
- *Structured replies > free text.* One schema for five card types made the
  UX 10x simpler and is the same contract a deployed AgentCore agent will
  serve — the "demo" agent and the "real" agent are a config switch apart.
- *Testing on a device is the critical path, not the code.* We built the
  prebuild/runbook day (this submission's Day 1) specifically to make
  hardware a one-evening step: 15-check E2E, gradle caveats, and a Fire OS
  console checklist for the voice intent.
- *Progress is the moat.* A show-aware companion without per-viewer progress
  is a wiki; with it, it's a companion. Next: sync progress from viewing
  history, not manual input.

## Mini challenges

- **AWS Builder** — multi-service pipeline: Bedrock (Sonnet) + Strands agent
  + AgentCore deployment path + IAM-bootstrapped CI (`day0-check.sh`);
  agentic architecture for the development workflow itself.
- **Open Source** — the agent is built on and forked from
  [`tv-agent-quickstart`](https://github.com/harshsinghhh120-bot/tv-agent-quickstart)
  (OSS quickstart); client + agent are MIT in public repos with an
  OSS-mini target against the official
  [react-native-multi-tv-app-sample](https://github.com/AmazonAppDev/react-native-multi-tv-app-sample).

## Repos

- Client + agent + docs: https://github.com/harshsinghhh120-bot/reelmind
- Agent quickstart (forked base): https://github.com/harshsinghhh120-bot/tv-agent-quickstart

## Run it yourself

```bash
# Agent (demo mode — no AWS):
cd reelmind/agent && ./start.sh demo          # 15/15: python3 e2e_demo_check.py

# TV app:
cd reelmind/client && npm install
# app.json → expo.extra.agentUrl = http://<agent-lan-ip>:8000
npm run prebuild && cd android && ./gradlew assembleDebug
adb connect <stick-ip>:5555 && adb install -r app/build/outputs/apk/debug/app-debug.apk
```

Full path + voice-intent console setup: `docs/day1-device-runbook.md`.

## Demo video

<LINK AFTER UPLOAD — record per `demo-script.md`, keep < 3 min>

## Credits

Built with an AI coding agent (Claude) in an agent-driven TDD loop, on AWS
Bedrock + Strands + AgentCore, for the Fire TV track of Build, Ship, Shape:
Amazon Developer Hackathon 2026.
