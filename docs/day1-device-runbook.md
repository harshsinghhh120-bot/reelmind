# Day 1 — Get ReelMind working on a real Fire TV

> **Status (2026-10-15):** agent side verified 15/15 (E2E + 27 unit tests), client
> type-checks (tsc + 20 Jest tests, green in GitHub CI). **Native build VERIFIED:**
> the first in-sandbox Gradle run produced a full debug APK
> (`:reelmind-remote:assembleDebug` + `assembleDebug` — BUILD SUCCESSFUL, JDK 17,
> AGP 8.9.1, arm64-v8a; `ReelMindRemoteModule`/`ReelMindRemotePackage` confirmed
> present in the DEX). That compile caught and fixed three RN 0.81 API breaks in
> the native module (commit `a9d50d9` — `rootView`, `NativeEventEmitter`,
> `Arguments.createHashMap` were all removed/renamed in 0.81). **Still
> unverified:** only on-device — adb install, the voice-intent console flow, and
> the demo video.

## 0. Prerequisites (one-time, on the PC)

| Tool | Version | Check |
|---|---|---|
| Node.js | ≥ 20 | `node -v` |
| Python | 3.11+ | `python3 -V` |
| JDK | 17 | `java -version` |
| Android SDK | 35 (Android 15) | `echo $ANDROID_HOME` set; `platforms/android-35` installed |
| adb | any recent | `adb version` |
| AWS CLI | v2 | `aws --version` (only for real-AI mode) |

## 1. Agent side (run this first — zero device risk)

```bash
git clone https://github.com/harshsinghhh120-bot/reelmind
cd reelmind/agent

# Demo mode (no AWS at all — canned offline answers):
./start.sh demo
python3 e2e_demo_check.py          # expect 15/15 PASS
```

Real AI mode (needs AWS credentials in your profile):

```bash
./day0-check.sh ap-south-1         # creates IAM policy + "reelmind" profile
./start.sh                         # starts with the reelmind profile
```

Warm demo state (optional but recommended — makes the spoiler-safe beat real):

```bash
python3 seed_demo_state.py --file /tmp/reelmind-demo.json --show
STATE_FILE=/tmp/reelmind-demo.json ./start.sh demo   # Shogun S1E6, Bear S2E8,
                                                     # Severance S1E9 + quiz history
```

Keep the agent machine and the Fire TV on **the same Wi-Fi**. Note the agent
machine's LAN IP (`ipconfig` / `hostname -I`) — the TV app needs it.

## 2. Build the TV app

```bash
cd reelmind/client
npm install

# 1) Point the app at the agent:
#    edit app.json → expo.extra.agentUrl → "http://<agent-lan-ip>:8000"

# 2) Generate android/ (applies the ReelMind config plugin:
#    exact voice intent action + explicit reelmind-remote registration):
npm run prebuild

# 3) Build the debug APK:
cd android && ./gradlew assembleDebug
```

APK lands at `android/app/build/outputs/apk/debug/app-debug.apk`.

**First-build gotchas** (the in-sandbox build hit each of the first three — all
have known fixes; the RN 0.81 API breaks they exposed are fixed in `a9d50d9`):

- *`SDK location not found`* → create `android/local.properties` with
  `sdk.dir=<your Android SDK path>`.
- *`./gradlew: Permission denied`* → freshly generated `android/` trees can lose
  the exec bit: `chmod +x android/gradlew`.
- *`OutOfMemoryError` / "Gradle build daemon disappeared"* on a ≤4 GB machine →
  the template default (`-Xmx2048m`) is too big; the flags below built the full
  APK on a 2 GB / 2-core box in ~3 min (after the first run's dependency
  downloads):
  ```bash
  ./gradlew assembleDebug --no-watch-fs "-PreactNativeArchitectures=arm64-v8a" \
    "-Dorg.gradle.jvmargs=-Xmx1200m -XX:MaxMetaspaceSize=192m -XX:ReservedCodeCacheSize=128m -XX:+UseSerialGC" \
    -Dorg.gradle.parallel=false -Dorg.gradle.workers.max=1 \
    -Dkotlin.compiler.execution.strategy=in-process -Dkotlin.incremental=false
  ```
  (arm64-only halves the work — Fire TV sticks are arm64; drop the
  `reactNativeArchitectures` flag for a release build targeting other ABIs.)
- *JDK/AGP mismatch errors* → use JDK 17 (the template Gradle wrapper pins
  compatible AGP/Kotlin; the `reelmind-remote` module inherits them).
- *`reelmind-remote` resolution errors* → confirm
  `android/settings.gradle` contains `include ':reelmind-remote'` pointing at
  `../packages/reelmind-remote/android` (the prebuild plugin adds this).
- *Manifest merge conflict on the voice intent filter* → the plugin writes the
  **raw** action `com.reelmind.app.ASK` directly into the generated manifest
  (Expo's own `intentFilters` config prefixes actions and would break the
  exact-match voice registration — that's why it's a plugin, not app.json).

## 3. Fire TV device

1. On the stick: **Settings → Device & software (or Preferences) → Developer
   options** → enable **ADB debugging** (and *ADB IP address* if prompted).
   The stick's IP shows in that same menu.
2. On the PC (same Wi-Fi):

```bash
adb connect <stick-ip>:5555
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n com.reelmind.app/.MainActivity   # launch by package
```

3. The app opens to **Home** (watchlist + quick-ask). Use the D-pad:
   right → a title → **Ask** (agent chat), **Quiz**, **Explain**
   (Kid/Standard/Deep tabs), **Briefing**, **Watch Party**.

## 4. Voice intent (Fire OS console) — the one-click demo

Register the custom voice intent so "Alexa, ask ReelMind …" works:

1. Fire OS Developer Options console (developer.amazon.com → your app
   **com.reelmind.app** → *Voice Intent*, or the local "Developer Options"
   on the stick for app-debug builds).
2. **Action:** `com.reelmind.app.ASK` — *exactly this string*. This is the raw
   action the app's manifest declares; Fire OS does exact matching, and Expo's
   config layer would have prefixed it, which is why the plugin exists.
3. **Intent to launch:** app `com.reelmind.app`, activity `.MainActivity`,
   data URI: `reelmind:ask?query={query}` (the `{query}` slot is filled with
   the spoken text). The native module also accepts an extra named `query` or
   `value` if you prefer the extras form.
4. **Utterance examples:** `Ask ReelMind about {query}` ·
   `ReelMind, what is {query}` · `Ask {query}` (broad → narrow; the
   narrowest first so Alexa resolves it fast).
5. Test on the stick: **microphone on remote → "Ask ReelMind, what is a black
   hole?"** → app re-launches on the Ask screen with the question already
   submitted to the agent. (Near-field. Far-field is Day 2 — see
   `day2-farfield-voice.md`.)

## 5. On-device test matrix (tick before recording the demo)

- [ ] Cold launch lands on Home, agent banner shows *connected* (LAN reach)
- [ ] D-pad: tab through titles, ENTER opens, BACK pops, focus ring visible
- [ ] Ask: type or voice a question → structured reply renders (text + cards)
- [ ] Quiz: 3-question flow, correct/wrong feedback, score at end
- [ ] Explain: same concept, **different** output for Kid vs Deep
- [ ] Briefing: sections render; progress ring reflects a real (or demo) watch %
- [ ] Watch Party: prompts list renders
- [ ] Voice: "Ask ReelMind …" re-launches into Ask with the question
- [ ] Kill the agent process → app shows *agent offline* (no crash)
- [ ] Re-start agent → reconnects (pull-to-refresh / re-open screen)

## 6. Troubleshooting

| Symptom | First move |
|---|---|
| Gradle: `Could not resolve :reelmind-remote` | check `settings.gradle` include + `projectDir`; `find packages/reelmind-remote/android` |
| APK installs, app shows *agent unreachable* | `adb shell ping <agent-ip>`; firewall on the agent machine (allow TCP 8000); stick + PC same SSID/VLAN |
| D-pad does nothing | `adb logcat -s ReactNativeJS` while pressing keys; confirm `ReelMindRemoteModule` loaded (`adb logcat | grep -i reelmind`) |
| Voice intent never fires | confirm the *exact* action string in console matches manifest (`adb shell dumpsys package com.reelmind.app | grep -A3 ASK`); utterances must match your examples |
| App crash on launch | `adb logcat -d *:E` — Hermes/JS errors print under `ReactNativeJS` |
| `userInterfaceStyle` warning at prebuild | `npm install expo-system-ui` (already in package.json now) |

## 7. What "done" unlocks

- **Demo video** (the hard deliverable): record the box → TV screen, follow
  `../submission/demo-script.md`.
- **Far-field voice** (hands-free across the room, via Fire TV Cube or a
  paired Echo) — Day 2: the *same* custom intent, no code change, one
  console toggle. See `day2-farfield-voice.md` (and why we deliberately are
  **not** doing VSK).
- **Product feedback section** of the submission (audience, use-cases, what we
  measured) — draft already in `../submission/devpost-form-draft.md`.
- **AgentCore deployment** (serverless agent, no always-on PC) — Day 2–3.
