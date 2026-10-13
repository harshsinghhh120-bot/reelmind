# Day 2 — Far-field voice (hands-free across the room)

**Terminology check (judges will notice):** VSK = *Video Skills Kit* — a
media/content integration (Amazon Catalog ingestion, Lambda, launcher) for
play/search of video content. **We are not doing VSK** — ReelMind is a
companion, not a content app, and VSK would be the wrong tool for
"Alexa, ask ReelMind …". What we *do* have is the **Fire OS custom voice
intent**, which is a different, lighter mechanism — and it already extends to
far-field with no code change.

## What works today (verified in manifest + source)

- **Near-field:** mic button on the Alexa remote → "Ask ReelMind, what is a
  black hole?" → custom intent `com.reelmind.app.ASK` launches the app with
  the spoken text (`docs/day1-device-runbook.md` §4).

## Far-field = hardware + one console toggle, zero code

Far-field on Fire TV means the request arrives via **Fire TV Cube** or a
**paired Echo** (the VSK overview in Amazon's docs defines it exactly this
way — a voice remote, even used away from the TV, is still *near-field*).

1. **Hardware:** you need a Cube or an Echo paired to the stick
   (Settings → Voice → pairing). If your demo device is a plain stick with
   no Echo, far-field is physically unavailable — say so honestly and keep
   the remote-mic demo (it's the strong one anyway).
2. **Console:** in the Fire OS Developer Options console, under the app's
   voice intent configuration, enable the intent for **far-field**
   (near-field/far-field scope). Same action string, same utterances — the
   console setting decides which microphone paths route the intent.
   *Verify the exact toggle name in the console when you get there; the
   console UI wording is the source of truth.*
3. **App code: none.** The intent is identical; the native module already
   consumes whatever extra/data the OS delivers, and `AppState` change
   triggers `consumeVoiceQuery()` on re-activation.

## What NOT to spend time on

- **VSK (Video Skills Kit):** requires catalog ingestion + Lambda + launcher
  integration; for content playback/search. Wrong scope for a hackathon
  companion; would burn days for zero demo gain. Mentioning the deliberate
  non-choice in the submission is a point for judgment, not a gap.
- **Media Session API:** voice transport controls (play/pause/ff) for apps
  that *play* media. We don't play media; skip (it's one manifest
  permission + a session later if a watch-party feature ever embeds
  playback).

## Demo-script impact

If an Echo/Cube is on hand: add one far-field shot to Beat 1 of
`submission/demo-script.md` — no remote in frame, hands on a snack, "Alexa,
ask ReelMind …", app responds. That single shot is the
"living-room AI companion" thesis in 5 seconds. If not: keep the
remote-mic shot; don't fake it.
