# ReelMind demo video — script + shot list (< 3 min, target 2:00–2:30)

**Goal:** one continuous believable arc — *remote voice in → agent thinking →
family-ready cards out → kid mode → quiz → spoiler-safe question*. No
slideshow, no terminal hero shots (terminal gets one 3-second cut).

**Setup (rehearse twice before recording):**
- Screen 1 (hero, 60% of frame): Fire TV (or laptop in 10-foot-UI mode)
  running the app. Keep the agent machine on the same Wi-Fi.
- Screen 2 (inserts): laptop showing `curl`/agent logs — only for the one
  "how it works" cut.
- Agent must be **live** (not demo mode) if you can — the "real Bedrock"
  line then costs you nothing. If AWS isn't ready, demo mode is fine; don't
  claim real AI on camera then.
- Seed the demo state: `cd agent && python3 seed_demo_state.py --file
  /tmp/reelmind-demo.json --show` then start the agent with
  `STATE_FILE=/tmp/reelmind-demo.json ./start.sh` — Shogun S1E6 (the
  spoiler-safe beat), The Bear S2E8, Severance S1E9, plus quiz history.

---

## COLD OPEN (0:00–0:12)

**Shot:** living room / TV screen, dark room, one show playing (any
streaming UI is fine — establish "this is a real TV").

**VO:** "Your TV shows you what to watch. Nothing shows you *what it means* —
or answers the 8-year-old who asks 'what's a black hole?' in the middle of it."

**Cut to:** ReelMind home screen.

---

## BEAT 1 — VOICE IN (0:12–0:35)

**Shot:** hand on the Alexa remote, mic button pressed (get the button-press
in frame).

**Say (on mic, real-time):** "Ask ReelMind — what is a black hole?"

**Cut to:** app re-launches into the Ask screen, question already submitted,
agent thinking, structured answer card renders.

**VO:** "That's a Fire OS custom voice intent — the spoken sentence lands in
the app as data, not a search box."

---

## BEAT 2 — THE FIVE CARDS (0:35–1:15)

**Shot:** D-pad navigation across the five entry points (one deliberate
right-right-right, not a slideshow — let the focus ring travel).

For each: open, one tap, result (hold 3–4 s each):

1. **Briefing** — "Plot, cast, and your spot: episode 3 of 8, 62%."
2. **Ask** — ask a plot question; show the reply.
3. **Explain** — same concept, tap **Kid** → tap **Deep**. *This is the money
   shot — let both answers stay on screen for a beat.*
4. **Quiz** — answer two of three, show the score.
5. **Watch Party** — prompts list.

**VO (over 1–5, sparse):** "One agent, one JSON contract — briefing, ask,
kid-or-deep explain, quiz, watch-party prompts. Every card is the same schema
from the same Strands agent on Amazon Bedrock."

---

## BEAT 3 — SPOILER-SAFE (1:15–1:45)

**Shot:** Ask screen again, D-pad into the input, type (or voice):
"What happens to [character] in the finale?"

**Cut to:** reply that references *your* progress ("You're 62% through S2E7 —
here's what's safe to tell you…").

**VO:** "The agent has a progress tool — it fetches *your* watch state before
answering. Same question, different viewer, different answer. That's the
difference between a wiki and a companion."

*(Optional 3 s cut: laptop showing the tool call in the agent log.)*

---

## BEAT 4 — CLOSE (1:45–2:10)

**Shot:** back on Home; progress ring visible.

**VO:** "ReelMind: the AI viewing companion for the living room — voice,
D-pad, and spoiler-safe, on the screen the whole room already shares."

**End card (3 s):** logo/title + repo URL + "Fire TV track · AWS Builder".

**Total: ~2:10. Buffer to 3:00 if a beat runs long — cut Beat 4 VO to two
sentences first.**

---

## Recording checklist

- [ ] TV/laptop output at 1080p, room light off, no reflections on glass
- [ ] Agent live on LAN; `curl http://<ip>:8000/health` returns 200
- [ ] Voice intent registered (runbook §4); rehearse the exact utterance
- [ ] Watchlist pre-loaded, 62% progress set on one title
- [ ] Screen record at native res (or 2-cam: phone on TV + laptop)
- [ ] Edit: jump cuts only, no re-records visible, caption "real device" if
      you used a stick — or caption the laptop honestly ("10-foot UI on
      laptop") — **never** let a judge discover a mismatch
- [ ] Upload < 3:00, private-link into the Devpost form, double-check duration
      in the form preview

## If the device build slips

Fallback (still honest, still demo-able): run the exact same app on a laptop
via `npx expo start` (touch input works — the native module degrades
gracefully), caption it "TV app, 10-foot UI (laptop stand-in for recording)",
and show the voice-intent manifest + runbook for the real-device path. The
product is identical; the input is not — say so out loud in the VO.
