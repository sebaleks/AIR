# demo-video/script.md: AIR end-to-end walkthrough

This is the live walkthrough for the AIR ambient-intent-router demo, driven from a terminal running `npm run demo`. Every `[SHOW]` is what is on screen. Every `[DO]` is an explicit keystroke or pause. Every `[SPEAK]` is what is said on camera.

Target runtime: 2:00–2:10 (sum of the per-section budgets below is ~2:05). The visual surface is the CLI runner's annotated output — six gates per event, composite scores, threshold-band labels, cooldown state, and the canonical HUD cue per decision. The pitch is *what AIR chose not to do, three times in two minutes, and that's the part that makes the times it did interrupt feel earned.*

Companion artifacts: `docs/demo-script.md` (scene-level narrative), `pitch.md` (long-form value framing the closer riffs on), `docs/glasses-cue-copy.md` (canonical HUD strings — never paraphrase).

Delivery rules:

- **No em dashes in spoken text.** Recording app reads them awkwardly.
- **No symbols read aloud as symbols.** Say "L zero", not "L0". Say "zero point three", not "0.3". Say "G two", not "G2". Say "H U D", not "hud".
- **AIR is one word, one syllable**, said like the word "air." Not "A I R" letters.
- **Composite score numbers** are read as "zero point six one one" (digit-by-digit after the decimal). The threshold cutoffs are "zero point three", "zero point five", "zero point seven", "zero point nine."

---

## 0. Pre-record checklist

- [ ] On Node 22: `nvm use 22`. Verify with `node --version` (expect `v22.x`).
- [ ] In repo root: `cd ~/Desktop/github/AIR && pwd` reads `/home/unobtainium/Desktop/github/AIR`.
- [ ] Dependencies installed: `npm install` ran cleanly.
- [ ] Test suite green: `npm test` reports `# pass 30`. If anything fails, fix before recording.
- [ ] Terminal: dark background, monospace font ≥ 16pt for legibility on the recording. Tmux / shell prompt minimal — ideally just `$ ` with no PS1 noise.
- [ ] Window is 110+ columns wide so the salience component table renders without wrap.
- [ ] OS in dark mode; the CLI uses ANSI colors tuned for dark contrast.
- [ ] System notifications muted.
- [ ] Screen recorder at 1920×1080, 30 fps, cursor highlight off (terminal is keyboard-driven; cursor visibility distracts).
- [ ] Practice run once: `npm run demo` and confirm the four canonical cue strings render: `Leave in 8 min?`, `Ask Victor about latency?`, `Running 5 min late. Text Alex?`, `Texted Alex.`. If any is missing or differs, stop and reconcile against `docs/glasses-cue-copy.md` before re-recording.
- [ ] Numbers in Appendix C match what the runner prints. If salience tunings drifted, update the spoken numbers in sections 2, 3, and 5.

---

## 1. Open and frame (10 seconds)

`[SHOW]` Terminal at the bash prompt. Cursor blinking after `$ `.

`[DO]` No keystroke yet. Hold the empty terminal for one beat as the line is delivered.

`[SPEAK]`
> "AIR is the Ambient Intent Router. It's the layer that decides when an always-on agent should stay silent, remember, ask, or act. Two minutes, three flows, and the part most demos skip — what we chose not to do."

`[DO]` Type `npm run demo` and press Enter.

---

## 2. Flow 1, event one — earned interruption (25 seconds)

`[SHOW]` Demo banner prints, then `▶ Flow 1 — Leaving Mode`, then the first event card: `departure_signal from calendar`, `minutes_to_departure=8`, `confidence=0.92`, `privacy_risk=0.20`. The salience composite block follows: six numbered components, then `total 0.611 → suggest band`. Below that, the policy decision: `suggest`, reason `score_in_suggest_band`, cooldown `clear`. Then the HUD line renders: `Leave in 8 min?`.

`[DO]` Pause one beat after `Leave in 8 min?` lands. The runner advances to event two automatically; do not press anything.

`[SPEAK]`
> "First event. Eight minutes to a calendar block. Six dimensions, one weighted score, total zero point six one one. Above zero point five, below zero point seven, that's the suggest band. The H U D shows one line. Leave in eight min, question mark."

`[SPEAK, framing]`
> "Notice what's on screen. The agent didn't just decide. It showed us why. Every component score, the composite, the band, the reason code, the cooldown state. Every cue is auditable."

---

## 3. Flow 1, event two — visible silence (20 seconds)

`[SHOW]` Second event card streams in: `departure_signal from location`, `minutes_to_departure=3`, `preapproved=true`. Salience composite reads `total 0.615 → suggest band`. But the policy decision line reads `remember`, reason `cooldown_active`, and the cooldown state shows the next eligible timestamp. The HUD line renders dim and parenthesized: `(silent — remember)`.

`[DO]` Hold for two beats on the silent-cue line. This is the "earned silence" beat.

`[SPEAK]`
> "Second event, ten seconds later. Score is zero point six one five. The salience engine wanted to interrupt. The cooldown gate said no. We just spoke. We're not going to speak again for ten minutes. The H U D stays empty, and the fact gets captured silently into memory so it isn't lost."

`[SPEAK, framing]`
> "This is the trust-critical part. An agent that interrupts every time it has something to say is an embarrassment. An agent that earned the right to stay quiet, on a score that would normally fire, is what makes the next interruption feel earned."

---

## 4. Flow 2 — silent capture, then resurface (30 seconds)

`[SHOW]` `▶ Flow 2 — Memory Capture` header, then three event cards in sequence. First: `voice_mention from voice` with the transcript line, total around zero point three five, decision `remember`, HUD silent. Second: `calendar_event_upcoming from calendar`, attendees `[Victor]`, total around zero point three seven, decision `remember`, HUD silent. Third event card has `kind: memory_resurfaced from memory`, total above zero point six, decision `suggest`, and the HUD renders `Ask Victor about latency?`. Below the third card, the runner prints the memory store contents: one record, summary `Ask Victor about latency issue`, sensitivity `low`, two triggers, a thirty-day expiry.

`[DO]` Pause for a beat on the silent voice mention. Pause again on the silent calendar event. The third event lands the cue; let it breathe before moving on.

`[SPEAK]`
> "Flow two. The user says, I should remember to ask Victor about latency. Score is zero point three five. That's the remember band. The H U D stays empty. The memory enters the store with a sensitivity tag, a confidence, an allowed-actions set, and an expiry. Memory with a contract, not a vector dump."

`[SPEAK]`
> "A while later, a calendar event comes in. One on one with Victor. The trigger we attached to the memory fires, and the agent constructs a synthetic event off the memory and runs it through the pipeline again. That second pass clears the suggest threshold. The H U D shows, ask Victor about latency, question mark."

`[SPEAK, framing]`
> "Two silences, then one cue. The cue earned its way to the H U D because the user previously cared, and the moment finally matched. That's memory governance, not retrieval."

---

## 5. Flow 3 — consentful action (25 seconds)

`[SHOW]` `▶ Flow 3 — Consentful Action` header, then the first event card: `calendar_event_upcoming from calendar`, attendees `[Alex]`, `minutes_to_event=-5`, total around zero point seven one, decision `ask_permission`. HUD renders: `Running 5 min late. Text Alex?`. Below it, the second event card: `user_confirmed_action from user_input`, `preapproved=true`, total at zero point nine zero exactly, decision `execute_preapproved`. HUD renders: `Texted Alex.` and a follow-up line: `Don't ask again for Alex?` with a parenthetical noting it's a preapproval grant prompt.

`[DO]` Pause briefly on the ask cue. Pause on the confirmation cue. Don't rush past either — they're the punctuation of the flow.

`[SPEAK]`
> "Flow three. Travel time plus calendar say the user will be five minutes late. Score is zero point seven one. That's the ask band. The H U D shows, running five min late, text Alex, question mark. The user taps yes."

`[SPEAK]`
> "Now the second cue. Score saturates at zero point nine. The action template is on the allowlist, so the policy executes silently and confirms. Texted Alex. Period. No question mark this time, because the action's already done."

`[SPEAK, framing]`
> "And the third cue, don't ask again for Alex, is the graduation step. The user can pre-approve this exact recipient and context, scoped, time-limited, revocable from the audit log. Consent isn't binary on a wearable. It's earned, narrowly, the same way attention is."

---

## 6. Close (15 seconds)

`[SHOW]` Demo footer: `Demo complete.` plus the pointer to `docs/demo-script.md`. Cursor returns to the prompt.

`[DO]` No keystroke. Hold the closing frame for the duration of the closing line.

`[SPEAK]`
> "Three flows, six gates, one formula, one cooldown. AIR is the policy and memory layer that decides when an always-on agent should stay silent, remember, ask, or act, and routes the rest to whichever model is best."

`[SPEAK]`
> "A general agent is powerful. An always-on wearable agent must be polite. The winning demo is the one that feels like it understands when not to bother you."

`[SPEAK, sign-off]`
> "That's AIR. Everything else is just a model call."

---

## Appendix A: Talking-point to UI mapping (drift audit)

If any `[SHOW]` no longer matches what `npm run demo` renders, fix the runner or the script before recording, not in post.

| Talking point | Where it lives in the runner output | Status |
|---|---|---|
| "Six dimensions, one weighted score, total zero point six one one" | Flow 1 event 1 salience composite block | ✅ |
| "Suggest band" / "remember band" / "ask band" | The `→ <band> band` annotation on the composite total line | ✅ |
| "Leave in eight min, question mark" | HUD line under Flow 1 event 1 | ✅ |
| "Score is zero point six one five" | Flow 1 event 2 composite total | ✅ |
| "Cooldown gate said no" | Decision line: `remember`, reason `cooldown_active`; cooldown state shows `next_eligible_at` | ✅ |
| "Memory with a contract" | Memory store contents block at end of Flow 2: sensitivity, triggers, expiry | ✅ |
| "Ask Victor about latency, question mark" | HUD line under Flow 2 event 3 (the `memory_resurfaced` synthetic event) | ✅ |
| "Score is zero point seven one" | Flow 3 event 1 composite total | ✅ verify against current `runningLateEvent` salience tuning |
| "Saturates at zero point nine" | Flow 3 event 2 composite total | ✅ verify against current `userConfirmedSendEvent` salience tuning |
| "Running five min late, text Alex" | HUD line under Flow 3 event 1 | ✅ |
| "Texted Alex" | HUD line under Flow 3 event 2 | ✅ |
| "Don't ask again for Alex" | Follow-up line printed by `runConsentfulActionDemo` after the execute cue | ✅ |
| "Earned silence" beat | Implicit — the Flow 1 event 2 silent HUD line is the visible artifact | ✅ |
| "Six gates" | Mentioned in narration only; the runner shows the *decision* per event but not the named gate that downgraded it (only the reason code). | 🟡 narrative-only; tuning in §3 walk-through still works because cooldown_active *is* a named gate |

### Numbers that are narrative-only (not surfaced in any single runner element)

These come from the docs and the test fixtures, not from a printed line in the runner:

- The four hackathon tracks (Ambient Agents, Memory, Agents for Good, Best Even G2 Integration) — the closing frames don't say them; if you want them on screen, plan a slide overlay in the recording app.
- The "thirty tests passing" number — only shown if the recording starts with `npm test` first, which the script doesn't currently do. Optional preamble.

---

## Appendix B: Pronunciation

| Written | Spoken |
|---|---|
| AIR | "air" (one word, one syllable, like atmospheric air) |
| Even G2 | "even gee two" |
| HUD | "H U D" (letters, separated) |
| LLM | "L L M" |
| L0 / L1 / ... / L5 | "L zero" / "L one" / ... / "L five" |
| 0.30 / 0.50 / 0.70 / 0.90 | "zero point three" / "zero point five" / "zero point seven" / "zero point nine" |
| 0.611, 0.615, etc. | "zero point six one one", "zero point six one five" (digit by digit after the decimal) |
| `suggest` / `ask_permission` / `execute_preapproved` | "suggest" / "ask permission" / "execute preapproved" (no underscores spoken) |
| `cooldown_active` | "cooldown active" |
| `memory_resurfaced` | "memory resurfaced" |
| 16 kHz PCM | "sixteen kilohertz P C M" |
| 4-bit greyscale | "four bit greyscale" |
| 576×288 | "five seventy six by two eighty eight" |
| Even Realities | "even reality's" (possessive ending) |
| Marp | "marp" (one word, rhymes with "harp") |
| Vite | "veet" (single syllable) |
| Codex | "code ex" |
| Anthropic | "an THROP ick" |
| OpenAI | "open A I" |
| LangChain | "lang chain" |
| McNemar / Wilcoxon | (not spoken in this script — held for Q&A) |

---

## Appendix C: Number sanity check

Pulled from the current `npm run demo` output and `src/demo/*.ts` salience tunings. All spoken numbers in sections 2, 3, 4, 5 come from here. If any drift after a code change, update the narration before recording.

### Flow 1 — Leaving Mode

- Event 1: `departure_signal`, `minutes_to_departure=8`, `confidence=0.92`, `privacy_risk=0.20`
  - Salience: urgency 0.867, confidence 0.920, user_value 0.500, annoyance 0.250, privacy 0.200, reversibility 1.000
  - Composite total: **0.611**
  - Band: `suggest` (0.50 ≤ total < 0.70)
  - Cue: **Leave in 8 min?**
- Event 2: `departure_signal`, `minutes_to_departure=3`, `preapproved=true`
  - Salience: urgency 0.950, confidence 0.880, user_value 0.500, annoyance 0.250, privacy 0.250, reversibility 1.000
  - Composite total: **0.615**
  - Band: `suggest`, but cooldown gate downgrades to `remember`
  - Reason code: `cooldown_active`
  - Next eligible: `last_interrupt_at + 10 min`

### Flow 2 — Memory Capture

- Event 1: `voice_mention`, transcript "I should remember to ask Victor about the latency issue"
  - Composite total: **~0.353**
  - Band: `remember`
  - Memory created with summary `Ask Victor about latency issue`, sensitivity `low`, triggers `[person_mention(Victor), calendar_event(title:latency, within:1440min)]`, 30-day expiry.
- Event 2: `calendar_event_upcoming`, attendees `[Victor]`, `minutes_to_event=15`
  - Composite total: **~0.371**
  - Band: `remember` (silent — does NOT fire its own cue)
- Event 3 (synthetic): `memory_resurfaced` from `memory`
  - Salience tuned: urgency 0.750 (from `minutes_to_departure=10`), user_value 0.85, annoyance 0.20
  - Composite total: **~0.640**
  - Band: `suggest`
  - Cue: **Ask Victor about latency?**

### Flow 3 — Consentful Action

- Event 1: `calendar_event_upcoming`, attendees `[Alex]`, `minutes_to_event=-5`, `minutes_to_departure=5`
  - Salience: urgency 0.917, confidence 0.95, user_value 0.90, annoyance 0.10, privacy 0.15, reversibility 0.4
  - Composite total: **~0.708**
  - Band: `ask_permission` (just inside 0.70 ≤ total < 0.90)
  - Cue: **Running 5 min late. Text Alex?**
- Event 2: `user_confirmed_action`, `preapproved=true`
  - Salience saturated: all positives at 1.0, all negatives at 0
  - Composite total: **0.900** exactly (clamped to threshold)
  - Band: `execute_preapproved`
  - Cue: **Texted Alex.**
  - Follow-up cue (post-execute, hackathon stub): **Don't ask again for Alex?**

If `npm run demo` prints values more than ±0.01 off from these, the seed events drifted — diff against `src/demo/leaving_mode.ts`, `src/demo/memory_capture.ts`, `src/demo/consentful_action.ts` and reconcile before recording.

---

## Appendix D: Optional add-ons (post-demo Q&A)

Live-runnable probes beyond the recorded script. Useful for booth demos and for judges who ask "is this real?".

- **`npm test`** — 30 tests, all green. Run before the recording starts if you want the test count visible.
- **`npm start`** — boots the orchestrator HTTP API at `http://localhost:3000`. Useful for `curl`-driven demos:
  - `curl -X POST http://localhost:3000/events -d '{...}'` — single-event ingestion with full decision response
  - `curl http://localhost:3000/state` — current memory store, decision log, event log
  - `curl -X POST http://localhost:3000/demo/leaving-mode` — Flow 1 only via API
  - `curl -X POST http://localhost:3000/demo/memory-capture` — Flow 2 only via API
  - `curl -X POST http://localhost:3000/demo/consentful-action -d '{"userResponse":"yes"}'` — Flow 3 with user response variation
- **`docs/g2-alignment.md`** — the audit doc mapping AIR onto the actual Even G2 SDK surface. Pull it up if a judge asks "does this run on real hardware?"
- **`docs/policy-rules.md` § 6** — the cooldown spec, in case a judge wants to see the math, not the demo, behind the silent second cue.
- **`pitch.md`** — long-form value pitch. Useful as a printed handout if booth time is short.

---

## Appendix E: Honest framing for Q&A

Things the script doesn't claim, but a judge might press on:

- The current demo runs on the orchestrator only — no Even G2 hardware in the loop. The G2 integration (audio capture, HUD rendering, touch input) lives behind the `EventSourceAdapter` and `CueRenderer` interfaces; stubs are written, but the SDK isn't wired up yet. See `docs/g2-alignment.md` for the per-API audit.
- The salience signals on demo events are tuned by hand to land in the intended threshold band. In production, they'd be derived from the event semantics and learned weights. The formula and the gates are real; the calibration is hackathon-grade.
- The preapproval grant in Flow 3 fires the cue but doesn't actually persist a `Preapproval` record. The full preapproval store is a follow-up — flagged in `docs/flow-consentful-action.md` § 8.
- Voice transcription in `voice_mention` events assumes the transcript is already there. The real adapter would run STT (Whisper, Deepgram, on-device) on top of the SDK's raw 16 kHz PCM stream and emit normalized events. Pluggable via the `Transcriber` field on `EvenG2BridgeAdapter`.
- The cooldown is one global budget, not per-template. Per-category budgets are post-hackathon work, called out in `docs/policy-rules.md` § 6.4.

These limits are the reasons the consult loop exists as a loop. They don't invalidate the demo.
