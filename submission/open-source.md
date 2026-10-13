# Open Source mini challenge — write-up (fill the URLs/username)

## Required fields

- **Contribution URL:** https://github.com/harshsinghhh120-bot/tv-agent-quickstart/commit/7a6f576de0fe9fa1c3211d651dae998ad0745cb8 (initial release of the kit)
- **Project repository URL:** https://github.com/harshsinghhh120-bot/tv-agent-quickstart
- **GitHub username:** harshsinghhh120-bot
- **Primary track repo (context):** https://github.com/harshsinghhh120-bot/reelmind

## What I did

Created **`tv-agent-quickstart`** (Apache-2.0), a new open-source Python kit
for building AI companion agents for TV apps, during the hackathon window.
Contents: a one-call Strands-on-Bedrock agent factory, an injectable LLM client
(Bedrock default, stub for tests), per-viewer memory (JSON-file store +
AgentCore Memory backend behind one interface), a validated `CompanionReply`
JSON protocol for 10-foot displays, a FastAPI `/chat` server factory, and an
optional Amazon Bedrock AgentCore deployment wrapper — plus a 10-minute
hello-world example and 27 offline unit tests.

## How it works

`ReelMind` (the Fire TV hackathon submission) `pip install`s this package and
runs on it at runtime: `reelmind_agent → tv_agent_kit` (agent factory, memory,
protocol, server). The kit's design rule — *the model decides, the kit
enforces* — means the TV client always receives a validated card
(`briefing | quiz | explain | …`) even if the model drifts, and every model
call is injectable so the whole core tests without AWS.

## Why it matters

"Chat box" APIs are everywhere; *companion* patterns for living-room displays
are not. TV apps need predictable response shapes, per-viewer memory,
spoiler/safety policies that survive model drift, and a fast-lane model for
latency-sensitive turns. The kit encodes those patterns so the next TV
companion (Fire OS, Vega, webOS, or smart-TV web) starts from a working shape
instead of a blank notebook — and gives the community a reference for
Strands + Bedrock + AgentCore in the TV context.

## Also open source in this submission

- `reelmind` itself: MIT, public, full source + setup in the README.
- `reelmind-remote` (Kotlin remote bridge): MIT inside the client package.
