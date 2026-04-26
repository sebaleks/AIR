# Demo script — 2 minutes for judges

A scene-by-scene walkthrough that fires every beat the four hackathon tracks reward (`docs/hackathon-tracks.md`) without going long. Total runtime target: **1:50**, leaving 10 seconds for breath and the closing line.

This is the script for the recorded walkthrough (**AIR-051**) and the live demo at the booth.

> Reads: `docs/glasses-cue-copy.md` for canonical strings; `docs/hackathon-tracks.md` for the tracks the demo is hitting.

---

## The 30-second elevator before the demo

> "AIR is the layer that decides *when* an always-on agent should stay silent, when to remember, when to interrupt, and when to ask. We're not building another chatbot — we're building the part the chatbot is missing: the policy and memory that make a wearable agent feel polite. Two-minute demo."

That's said before the recording starts. The recording itself is silent except for the narrator track described below.

---

## Setup state

A simulated day is preloaded into the demo orchestrator:
- **User:** "Nick" — single user, no multi-tenant complexity.
- **Calendar:** Two events. `9:00 AM 1:1 with Victor`, `3:00 PM sync with Alex`.
- **Routine memory (preloaded):** "User usually packs charger on Monday mornings."
- **Stored memory from yesterday (preloaded):** Captured `voice_mention` at 18:10 yesterday — `"I should remember to ask Victor about the latency issue."` Triggers: `person_mention: Victor`, `calendar_event: title_contains "latency"`. (This shows judges that capture has *already happened* and the resurface is what they're watching.)
- **No preapprovals** at start. One will be created during the demo.

The demo runner replays the simulated day at 60× speed: 1 simulated minute = 1 real second.

---

## Scene-by-scene

### Scene 1 — Ambient silence (0:00 – 0:15)

**On-screen:** Terminal showing the orchestrator's event log. Three events stream in over 15 seconds (simulated 8:20–8:35 AM): a location ping (user is home), a `routine_pattern_match` for charger, and a `calendar_event_upcoming`.

**HUD:** **Silent.** No cue.

**Audit log shows:** three decisions, all `ignore` or `remember`. The `remember` decision creates a `MemoryRecord` for the charger reminder with `expires_or_revalidates: end_of_day`.

**Narrator caption:** *"Three events. Zero interruptions. The agent is paying attention — but it hasn't earned the right to speak yet."*

**Track hit:** Ambient Agents — proves the system can hear without talking.

---

### Scene 2 — Earned interruption (0:15 – 0:35)

**On-screen:** A `departure_signal` event arrives at simulated 8:54 AM. Salience engine output flashes on screen: `total = 0.625` (above the suggest threshold). Policy pipeline visualizes the six gates, all green.

**HUD:** `"Leave in 6 min for 9:00 class?"`

**User taps yes** (simulated).

**HUD updates:** `"Route ready. Bring charger?"` — chained two-statement cue. The "Bring charger?" half is the cooldown-tolerant resurface of the routine memory from Scene 1.

**User taps yes again.**

**HUD:** `"Reminder set."`

**Narrator caption:** *"The first cue earned its way onto the HUD. The agent piggybacked the second one because the user was already attending."*

**Track hit:** Best G2 Integration — every cue ≤ 40 chars, no exclamations, soft-question form for asks, period-statement for confirmations.

---

### Scene 3 — Why this cue? (0:35 – 0:50)

**On-screen:** A finger taps the cue from Scene 2 in a settings-style overlay. The "Why this cue?" panel opens, showing:

```
Cue:    "Leave in 6 min for 9:00 class?"
Reason: salience_high_user_value
Inputs:
  urgency: 0.90      confidence: 0.92
  user_value: 0.85   annoyance_cost: 0.20
  privacy_risk: 0.20  reversibility: 1.0
  → composite: 0.625

Cooldown: not active
Memory consulted: mem_charger_routine
Preapproval consulted: none
```

**Narrator caption:** *"Every cue is auditable. This is why the privacy story isn't marketing — it's mechanical."*

**Track hit:** Agents for Good — explainability is a precondition for trust.

---

### Scene 4 — Memory resurface (0:50 – 1:15)

**On-screen:** Time fast-forwards to 9:14 AM. A `calendar_event_upcoming` for "1:1 with Victor" arrives. The orchestrator runs `findResurfaceCandidates`, finds the preloaded `Victor latency` memory, and constructs a synthetic `memory_resurfaced` event. The pipeline runs again with memory-governance constraints.

**HUD:** `"Ask Victor about latency?"`

**User taps yes.**

**HUD:** `"Text Victor re: latency issue?"` — chained `ask_permission` cue (this is now Flow 3 territory).

**User taps yes.**

**HUD:** `"Texted Victor."`

**Narrator caption:** *"The agent remembered something the user mentioned yesterday — but only surfaced it because Victor showed up on the calendar. Memory with a reason."*

**Track hit:** Agents with Memory — surfacing on context match is the governance layer.

---

### Scene 5 — Cooldown (1:15 – 1:30)

**On-screen:** Fast-forward to 9:18 AM. A second `routine_pattern_match` arrives with `total = 0.58` (would normally `suggest`). The cooldown gate visualizes: `last_interrupt_at = 9:14 AM`, `next_eligible_at = 9:24 AM`. The gate downgrades to `remember`. Reason code: `cooldown_active`.

**HUD:** **Silent.**

**Audit log shows:** the new `MemoryRecord` was created with `resurface_triggers: [{ kind: "time_window", match: { hour_start: 9:24 } }]`.

**Narrator caption:** *"The agent had something to say. It chose silence — and remembered to bring it up later."*

**Track hit:** Agents for Good — interruption budget made visible.

---

### Scene 6 — Consentful action + graduated consent (1:30 – 1:50)

**On-screen:** Fast-forward to 2:55 PM. Travel-time + calendar shows the user will be 5 minutes late to the 3 PM with Alex.

**HUD:** `"Running 5 min late. Text Alex?"`

**User taps yes.**

**HUD:** `"Texted Alex."` followed immediately by `"Don't ask again for Alex?"`

**User taps yes** to the preapproval grant.

**On-screen:** `Preapproval` record appears in settings: scope `recipients: ["alex@example.com"]`, `max_per_day: 3`, `expires_at: 2026-07-25`.

**Narrator caption:** *"Consent isn't binary. The user just taught the agent how to handle this case — narrowly, time-limited, revocable."*

**Track hit:** Agents for Good (graduated consent), Best G2 Integration (chained two-line cue still under budget).

---

## Closing line (off-screen narration after Scene 6)

> "Five decisions. Two memories. One preapproval. Two cues skipped. The cooldown said 'not now.' The privacy override said 'ask first.' That's the product. Thank you."

---

## What the judge should leave with

If the judge can only repeat one sentence about AIR after the demo, this is the sentence: **"It's an agent that decided not to interrupt, three times in two minutes, and that's the part that makes the times it did interrupt feel earned."**

That's the inversion of the typical hackathon pitch. Most demos try to show how *much* the agent can do. AIR shows what it chose *not* to do.

---

## Timing breakdown

| Scene | Duration | Cumulative |
|---|---|---|
| 1 — Ambient silence | 0:15 | 0:15 |
| 2 — Earned interruption | 0:20 | 0:35 |
| 3 — Why this cue? | 0:15 | 0:50 |
| 4 — Memory resurface | 0:25 | 1:15 |
| 5 — Cooldown | 0:15 | 1:30 |
| 6 — Consentful action | 0:20 | 1:50 |
| Buffer | 0:10 | 2:00 |

If we run long, the first cut is Scene 3 (the audit-log inspection). It's the most "static" scene visually and the privacy story can be made in narration alone.

---

## Recording notes (for AIR-051)

- Resolution: 1080p minimum, 60fps if the terminal renderer supports it (cooldown gate animation needs to read).
- Terminal theme: dark, monospace, ≥ 14pt for the recording.
- Narrator track: separate `.mp3` overlaid on top — keeps the recording silent so judges can scrub.
- Aspect ratio: 16:9. We embed in the README + pitch deck.
- Tools: `asciinema rec` for terminal capture, then `agg` for GIF if needed; otherwise OBS for screencast.
- File: `assets/demo-walkthrough.mp4` + `.gif` fallback.

---

## What this script depends on

| Beat | Implementation task |
|---|---|
| Scene 1 — silent decisions in audit log | AIR-022 + AIR-025 |
| Scene 2 — Leaving Mode chain | exists in baseline; refine when AIR-024 lands |
| Scene 3 — Why this cue? overlay | AIR-014 (audit-log schema) + UI layer (out of scope for hackathon — can be a printed JSON) |
| Scene 4 — memory resurface | AIR-022 |
| Scene 5 — cooldown downgrade | AIR-025 |
| Scene 6 — consentful action + preapproval | AIR-023 |

If AIR-022 + AIR-023 + AIR-024 + AIR-025 don't all land before recording, fall back to Scene 1 + Scene 2 + Scene 3 only — that's still a coherent 50-second demo of "earned interruption + explainability."
