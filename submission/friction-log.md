# Friction log (template + seeds)

> Up to 10% judging bonus. Each entry: **task · steps · expected vs actual ·
> severity (Low/Med/High) · workaround · suggestion**. Replace/expand the seeds
> below with your real entries from Days 0–9 — real ones beat polished ones.
> Keep 4–8 strong entries.

## Seed entries (replace with your own)

### F1 — [Tool: ADBT for AI]
- **Task:** [e.g., wire the custom voice intent end-to-end (console → manifest → JS)]
- **Steps:** [created custom intent in Developer Options, added intent filter via Expo app.json, consumed intent in Kotlin module]
- **Expected:** [ADBT MCP has a workflow/tool for voice intent setup, as it has for IAP]
- **Actual:** [ADBT at launch covers IAP + doc search only; voice intent flow had to be assembled from Fire OS docs + Android knowledge]
- **Severity:** Medium
- **Workaround:** [wrote the console steps into the README and encoded them as a Kiro steering note]
- **Suggestion:** [add a "voice intents" ADBT workflow: generate manifest intent-filter + Kotlin consumption scaffold + console mapping checklist]

### F2 — [Tool: Amazon Bedrock / AgentCore]
- **Task:** [verify region availability from an India-based account]
- **Steps:** [checked Bedrock model list + AgentCore console in ap-south-1, then us-east-1]
- **Expected:** [a single page listing which services/models are in which region]
- **Actual:** [had to check each surface separately; [actual gaps you hit]]
- **Severity:** Medium
- **Workaround:** [Day-0 checklist script in the README; pinned MODEL/FAST_MODEL env vars]
- **Suggestion:** [one "availability matrix" page in the AgentCore docs]

### F3 — [Tool: Strands Agents SDK]
- **Task:** [get a structured (JSON) final answer from the agent]
- **Steps:** [tried passing the pydantic model as output_type / prompted JSON + validated client-side]
- **Expected:** [first-class pydantic output]
- **Actual:** [final answer arrives as text; kit validates/downgrades via CompanionReply protocol]
- **Severity:** Low
- **Workaround:** [tv-agent-quickstart `parse_reply()` coercion layer — model decides, kit enforces]
- **Suggestion:** [document the recommended structured-output pattern for conversational agents]

### F4 — [Tool: Fire TV / Expo RN]
- **Task:** [capture D-pad keys in a React Native (Expo) app without a third-party focus library]
- **Steps:** [wrote a local RN package (reelmind-remote): Kotlin OnKeyListener on the React root view + JS event emitter]
- **Expected:** [a documented RN key-event API for TV, or first-party Expo TV support]
- **Actual:** [key capture requires the native-module workaround; focus must be virtual]
- **Severity:** Medium
- **Workaround:** [reelmind-remote + pure-TS focus grid (lib/focus.tsx) — ~200 LOC, zero TV deps]
- **Suggestion:** [first-party `react-native-tv` key/focus primitives, or an Expo config-plugin for TV key events]

### F5 — [Tool: Expo / React Native] (real, Day 1)
- **Task:** register the Fire OS custom voice intent (`com.reelmind.app.ASK`) in an Expo RN app
- **Steps:** added the custom action via Expo's `android.intentFilters` config in `app.json`, ran `expo prebuild`, diffed the generated `AndroidManifest.xml` against the Fire OS console requirements
- **Expected:** the action string lands in the manifest verbatim — the Fire OS console matches intent actions **exactly**
- **Actual:** Expo prefixes custom actions → manifest contained `android.intent.action.com.reelmind.app.ASK`. Fire OS exact-match would never fire the app; failure is **silent** (no build error, no runtime log — voice simply never works)
- **Severity:** High
- **Workaround:** custom Expo config plugin (`client/plugins/withReelMindNative.js`) that writes the raw manifest intent-filter with the exact action and strips the prefixed duplicate; verified idempotent across re-prebuilds
- **Suggestion:** pass non-`android.intent.action.*` actions through verbatim (or add a `raw: true` flag) and document exact-match platforms (Fire OS) in the intentFilters docs

### F6 — [Tool: Expo / React Native] (real, Day 1)
- **Task:** include a **local** RN native package (`reelmind-remote`, `file:./packages/…`) in a prebuild app
- **Steps:** `expo prebuild`, inspected `android/.autolinked_packages.json` and the generated `MainApplication.kt` for the module
- **Expected:** local `file:` native dependencies are autolinked like node_modules ones
- **Actual:** autolink did **not** pick the local module up (autolink file empty for it) — the app runs fine and JS `NativeModules.ReelMindRemote` is simply `null`; with graceful degradation in JS, keys and voice silently do nothing on device
- **Severity:** High (same silent-failure class as F5)
- **Workaround:** explicit registration via the same config plugin — `settings.gradle` `include ':reelmind-remote'` + `projectDir`, `implementation project(':reelmind-remote')` in the app, and `add(ReelMindRemotePackage())` in `MainApplication.kt`
- **Suggestion:** document (or add a prebuild warning for) local native modules that did not autolink; first-party support for explicit local-module registration

### F7 — [Tool: Expo / Android] (real, Day 1)
- **Task:** make a local Android library module (`:reelmind-remote`) compile against the Expo SDK 54 template
- **Steps:** wrote the library `build.gradle` the standard way (own `buildscript` with pinned AGP/Kotlin + `react-android` with a version), generated the project
- **Expected:** library builds with its own declared toolchain versions
- **Actual:** the SDK 54 template root uses **versionless** `classpath('com.android.tools.build:gradle')` entries (versions resolved at the root), so a library pinning its own AGP/Kotlin risks version-conflict failures and a versioned `com.facebook.react:react-android` risks misalignment with the RN the template actually ships
- **Severity:** Medium (only bites at first `./gradlew assembleDebug`)
- **Workaround:** library declares **no** buildscript — inherits root AGP/Kotlin; depends on versionless `com.facebook.react:react-android` (aligned by the RN gradle plugin); `compileSdk`/`minSdk` read from `rootProject.ext.*`
- **Suggestion:** a documented "add a local native module" recipe in the Expo TV/Android template (include, dependency, registration, version-inheritance rules)
