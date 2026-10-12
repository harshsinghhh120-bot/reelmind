# ReelMind client (Fire TV)

React Native (Expo SDK 54, RN 0.81) TV app. Landscape, dark 10-foot UI, virtual
focus system in pure TypeScript, remote bridge in Kotlin.

## Build & run on a Fire TV stick

1. `npm install`
2. Set the agent URL in `app.json` → `expo.extra.agentUrl` (LAN IP of the
   machine running the agent; the stick and machine must share a network).
3. `npx expo prebuild --platform android` (generates `android/` once; safe to
   regenerate).
4. `npx expo run:android --device <stick-ip>:5555`
   (with `adb connect <stick-ip>:5555` and ADB debugging enabled on the stick).

> The `reelmind-remote` native module requires a dev-client/prebuild build —
> Expo Go cannot load local native modules.

## Check before you ship

```bash
npx tsc --noEmit          # type-check (CI in the hackathon used this)
npx expo export --platform android   # Metro/Hermes bundle build
```

## Input model

- **Remote D-pad / ENTER / BACK** — captured by `ReelMindRemoteModule` (Kotlin)
  on the React root view, forwarded to JS as `reelmind_key_event`. Focus
  navigation (nearest-node grid walk, same-lane preferred) lives in
  `lib/focus.tsx`. ENTER selects, BACK pops the screen stack.
- **Touch** — any Focusable also responds to tap (graceful fallback, and how
  you'll test on the simulator without a remote).
- **Voice** — Fire OS custom intent `com.reelmind.app.ASK` (see root README §3
  for the Developer Options console setup). The spoken text arrives as intent
  extra `query` (or data URI) and is consumed by
  `ReelMindRemoteModule.consumeLaunchIntentText()` on app launch/activate.

## Screens

Home (title picks + actions + voice hint) → Briefing (AI sections + actions) →
Ask (chat thread, quick chips, progress chips) → Quiz (2×2 options, live score)
· Explain (topics × kid/standard/deep) · Watch Party (discussion prompts).

## Vega OS notes

The app targets **Fire OS** (Android APK) for the hackathon demo. For a Vega
OS build (2025 4K Select / 2026 Stick HD / 2026 Stick 4K 3rd gen), the React
Native codebase is the same platform; use the **Amazon Vega SDK** build flow
(`@amazon-devices/*` packages, `.kepler.ts` platform files) per Amazon's
multi-TV sample repo (`AmazonAppDev/react-native-multi-tv-app-sample`) and the
ADBT Fire OS→Vega migration workflow. Budget 1–2 days; the JS/app code does
not change — only the packaging/platform layer.
