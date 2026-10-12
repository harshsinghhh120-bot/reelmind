# Project description (draft for the Devpost form)

> Paste into the "Project description" field. Trim to taste; keep it under ~600 words.

**ReelMind is an AI viewing companion that lives on your Fire TV.** Tell it what
you're watching — by voice, D-pad, or touch — and it briefs you, answers
questions without spoiling your episode, quizz-ifies the couch, and explains
anything in kid mode.

**The problem.** Streaming killed the "watching together" moment. We watch
alone, miss context, and can't ask questions without a phone in our hands.
Existing TV "companion" experiences are either static wikis (spoilers everywhere)
or require a second screen.

**What ReelMind does.**

1. **Briefing** — pick or say a title; the agent (Claude Sonnet on Amazon
   Bedrock, via the Strands Agents SDK) returns a structured briefing: premise,
   why it's being talked about, cast, watch-along tips.
2. **Spoiler-safe Q&A** — ReelMind remembers *your* progress per show
   ("S2E8 of The Bear") in per-viewer memory and enforces a hard spoiler law:
   nothing past your episode, with a visible "spoilers locked" badge.
3. **AI Pop Quiz** — themed quizzes (easy/medium/hard) with deterministic
   grading (A–D, text, or free answers, LLM-adjudicated when ambiguous) and a
   running score.
4. **Explain this** — any concept from the show in **kid / standard / deep**
   language. The family-entertainment engine.
5. **Watch party** — between-episode discussion prompts, generated spoiler-aware.

**Multi-modal UX.** One agent, three input modes: Alexa voice remote (Fire OS
custom voice intent → Kotlin bridge → agent), D-pad navigation through a
hand-rolled virtual focus system (pure TypeScript 2D grid walk, same-lane
preferred), and touch. All three drive the same conversation.

**Architecture.** React Native (Expo SDK 54) TV app → FastAPI `/chat` → Strands
agent on Amazon Bedrock (Sonnet for reasoning, Haiku for the fast lane: quiz
gen, grading, explains). Every reply is validated into a fixed JSON protocol
so the TV never guesses what the model said. The agent runs on
`tv-agent-quickstart`, a new open-source kit we extracted from this project
(Apache-2.0). The agent can also deploy to **Amazon Bedrock AgentCore**
(runtime + memory + gateway) with one env var.

**AWS Builder mini.** Bedrock + Strands + AgentCore at runtime; **Kiro with the
Amazon Devices Builder Tools (ADBT) MCP server** drove the Fire TV client build
(D-pad, focus, 10-foot UI, Fire OS vs Vega context). See Product Feedback.

**Open Source mini.** `tv-agent-quickstart` (new repo, created in the
hackathon window, Apache-2.0) is imported and executed by this project at
runtime; this repo is MIT and public. Details in Open Source section.

**Status.** Built during the submission window (new project, no prior version).
Runs on a Fire TV (Fire OS) — see demo video. 33 offline unit tests passing;
type-check and Hermes bundle verified.

**Repo.** <repo URL> · **Demo video.** <YouTube URL>
