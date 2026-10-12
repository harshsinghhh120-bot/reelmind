# Feature requests (template + drafts)

> Format per the rules: description · why it matters to ReelMind · priority
> (Critical / Important / Nice-to-have). Pick the 2–3 you actually felt.

## FR1 — ADBT: voice-intent workflow for AI agents
- **Description:** An ADBT (Amazon Devices Builder Tools) MCP workflow that
  scaffolds a Fire OS custom voice intent end-to-end: Developer Options console
  mapping checklist, manifest intent-filter (Expo/native), and the Kotlin
  intent-consumption module.
- **Why it matters to ReelMind:** voice is one of our three input modes;
  assembling it from Fire OS docs + Android knowledge took ~a day and ADBT had
  no coverage for it (IAP + doc search only at launch).
- **Priority:** Important

## FR2 — AgentCore: single region-availability matrix
- **Description:** One page (console + docs) listing, per AWS region: AgentCore
  surfaces (runtime, memory, gateway, identity, browser), available models,
  and quotas.
- **Why it matters to ReelMind:** Day-0 planning from an India-based account
  required checking Bedrock models and AgentCore surfaces separately; the
  "deploy to AgentCore or not" decision should be a 30-second lookup.
- **Priority:** Important

## FR3 — Fire TV: first-party React Native key/focus primitives
- **Description:** Official RN/Expo support for TV hardware keys (D-pad, ENTER,
  BACK) and a reference focus protocol — either a first-party library or a
  sanctioned config plugin for dev-client builds.
- **Why it matters to ReelMind:** we shipped a local native package
  (`reelmind-remote`) + a pure-TS focus grid (~200 LOC) because no first-party
  path exists for RN-on-TV; a standard primitive would cut onboarding for the
  whole RN-TV community (and lower our demo's technical risk).
- **Priority:** Nice-to-have

## FR4 — Strands: documented structured-output pattern for chat agents
- **Description:** An official pattern/example for guaranteeing a typed final
  response (pydantic) from a conversational Strands agent, including how tool
  results (cards) should be relayed verbatim.
- **Why it matters to ReelMind:** our kit added a validation/coercion layer
  (`parse_reply`) because the final answer arrives as free text; a blessed
  pattern would prevent the whole class of "model rewords the card" bugs.
- **Priority:** Nice-to-have
