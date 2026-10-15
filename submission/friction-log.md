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
### F8 — [Tool: Expo / React Native] (real, Day 2)
- **Task:** add Jest unit tests to the Expo SDK 54 client
- **Steps:** `npm install -D jest jest-expo` (latest), expecting the standard RN preset flow
- **Expected:** latest `jest-expo` pairs with the installed Expo SDK
- **Actual:** npm resolved `jest-expo@57` → ERESOLVE: its `@react-native/jest-preset@0.86` requires `react@^19.2.3` but SDK 54 ships `react@19.1.0` / RN 0.81. `expo-system-ui` installed the same way had the same disease (`^57.x` in an SDK 54 project — it happened to not break prebuild, but was still wrong)
- **Severity:** Medium (a wrong-but-installing version is worse than an error: it ships a subtly mismatched dependency)
- **Workaround:** `npx expo install jest jest-expo expo-system-ui` — the Expo-aware installer pins SDK-matched versions (jest-expo ~54, expo-system-ui ~6); jest/@types/jest pinned to 29 to match
- **Suggestion:** `npm install` peer-checks should flag *Expo SDK* mismatches, not just raw peer ranges — or publish each `expo-*` package with an SDK-coupled `peerDependency` on `expo`
### F9 — [Tool: React Native 0.81 / new-architecture] (real, Day 3)
- **Task:** compile the custom `reelmind-remote` Kotlin module against the RN the Expo SDK 54 template actually ships (0.81.4, new arch)
- **Steps:** first-ever `./gradlew :reelmind-remote:assembleDebug` (JDK 17, Android SDK 35) — done in the dev sandbox before device day, specifically to de-risk the first build
- **Expected:** the module code (written against the long-standing RN module APIs) compiles
- **Actual:** three breaking removals/renames in 0.81, none announced in docs we'd found: (1) `ReactActivity` no longer exposes `rootView`/`getRootView()` — the root view is now reached via `reactDelegate.reactRootView`; (2) the `com.facebook.react.modules.core.NativeEventEmitter` **base class is gone from the Android bundle** — a module that `extends NativeEventEmitter` won't compile, and on the JS side `new NativeEventEmitter(module)` now *throws* when the module lacks `addListener`; (3) `Arguments.createHashMap()` renamed to `Arguments.createMap()`
- **Severity:** High (silent for weeks — only surfaces at the first native compile; the JS-side `NativeEventEmitter` failure would have been a runtime crash on-device, not a compile error)
- **Workaround / fix (in `a9d50d9`):** emit through the core JS module directly — `reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java).emit(name, Arguments.createMap().apply {...})` — which is exactly what `NativeEventEmitter.sendEvent` did internally pre-0.81; JS subscribes with the `DeviceEventEmitter` singleton. All API surfaces verified by `javap` against the actual `react-android-0.81.4.aar`. After the fix: full `assembleDebug` BUILD SUCCESSFUL, module classes confirmed in the DEX
- **Suggestion:** an "upgrade notes" page per RN release enumerating removed Java/Kotlin module APIs (not just JS), and a compile-time/lint check for `extends NativeEventEmitter` in new-arch builds
