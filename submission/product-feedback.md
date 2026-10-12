# Product feedback (draft — fill the [brackets] from your real experience)

> One block per tool. The form asks: which tools for what · what worked well ·
> what needs work · onboarding (zero→hello world) · would you build again (Y/N + why).
> Be specific and honest — judges reward real friction (it also feeds the friction log).

## 1. Fire TV (Fire OS) + ADBT for AI (MCP server & agent skills)

- **Used for:** the entire client build — D-pad focus system, 10-foot UI
  patterns, voice intent wiring, and [Fire OS ↔ Vega packaging questions].
- **Worked well:** [e.g., ADBT doc search inside Kiro answered focus-management
  questions instantly; the Fire TV nuance context (focus targets, 10-foot)
  saved a day of trial and error; developer options ADB sideload was smooth].
- **Needs work:** [e.g., ADBT coverage was IAP + docs search at launch — no
  MCP tooling for voice intent console setup; Vega migration workflow only
  covers WebView/RN app types; [any error you hit]].
- **Onboarding:** [rating + one paragraph: zero→hello world on the stick took
  X hours; what was clear/confusing].
- **Build again?** Yes — [why].

## 2. Amazon Bedrock

- **Used for:** Claude Sonnet (companion turns, briefings, quiz authoring) +
  Claude Haiku (fast lane: quiz gen, grading adjudication, explains, prompts)
  via `converse` with `responseFormat: json`.
- **Worked well:** [e.g., JSON mode made structured cards reliable; Haiku
  latency on the fast lane kept the quiz snappy; boto3 ergonomics].
- **Needs work:** [e.g., model availability differs by region — [region] lacked
  [model], so we had to pin [other model]; [latency spikes, console gaps]].
- **Onboarding:** [zero→first converse call: minutes/hours; docs clarity].
- **Build again?** Yes — [why].

## 3. Strands Agents SDK

- **Used for:** the companion agent: 6 `@tool` functions, system-prompt policy,
  structured output.
- **Worked well:** [e.g., `@tool` decorator → docstring-as-description is the
  right level of magic; agent loop handled tool relay without orchestration
  code].
- **Needs work:** [e.g., structured-output typing [how you had to parse the
  final reply]; docs for [X] were thin; [version churn notes]].
- **Onboarding:** [zero→first agent: minutes/hours].
- **Build again?** Yes — [why].

## 4. Amazon Bedrock AgentCore

- **Used for:** [deployment target for the Strands agent: runtime + memory +
  gateway] / [NOT USED — deployed plain FastAPI because AgentCore wasn't
  available in our region; the kit still supports it with one env var].
- **Worked well:** [if used: dev loop, memory API, gateway endpoint shape].
- **Needs work:** [if used: [specific gaps]]; [if not used: region availability
  at submission time was [X] — this is exactly the gap a "where is AgentCore
  available" page would fix].
- **Onboarding:** […].
- **Build again?** [Yes/No — why].

## 5. Kiro (with ADBT + Strands/AgentCore MCP servers)

- **Used for:** the development workflow for both repos: Kiro Crew-style agent
  tasks generated the React Native client shell, the Kotlin remote bridge, the
  Strands agent + tools, tests, and this README family; steering rules
  enforced "Fire TV → ADBT docs first", "agents → Strands + Bedrock",
  "deploy → AgentCore".
- **Worked well:** [e.g., MCP doc search kept Kiro from inventing Fire TV APIs;
  spec/steering files kept 11 days of agent-generated code consistent].
- **Needs work:** [e.g., [Kiro quirks: context limits, long builds, [X]]].
- **Onboarding:** [first project in Kiro: minutes/hours].
- **Build again?** Yes — [why].

## AWS Builder summary (paste into the AWS Builder answer)

Runtime: **Amazon Bedrock** (Sonnet + Haiku via `converse`), **Strands Agents
SDK** (the agent + 6 tools), **AgentCore** [deployed as the runtime/gateway /
supported as a one-env-var deployment path]. Development: **Kiro** with the
**ADBT MCP server for AI** (Amazon's own Fire TV tooling) as the primary
agentic development tool. Code locations: `agent/reelmind_agent/*`
(Strands/Bedrock), `tv_agent_kit/*` (kit), `client/packages/reelmind-remote/*`
(Fire TV native layer built with Kiro+ADBT).
