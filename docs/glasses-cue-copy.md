# Glasses cue copy

Source-of-truth for every string the wearable HUD shows. Written for Even G2 (heads-up display + mic, no camera). If `src/` ever generates a user-facing string, it should match a template here.

Owner: Nick. Update this doc *before* changing copy in code.

---

## 1. The contract

A glasses cue is a **short text shown on the HUD for ≤4 seconds**, optionally followed by a tap-to-confirm or voice-yes/no prompt. The user is in their day — looking at people, walking, talking. Copy must read in a glance and never demand attention beyond what was earned.

This is the AIR product thesis applied to text: *"Wearable AI must be polite."* Long, hedging, or chatty cues break that promise.

---

## 2. Char budget

| Format | Target | Hard max | When to use |
|---|---|---|---|
| Single-line | **≤ 40 chars** | 60 | Default. All `suggest` and `ask_permission` cues. |
| Two-line (chained) | ≤ 40 per line, ≤ 80 total | 100 | Only after the user has just said "yes" to a prior cue and is already attending. |

A cue that exceeds 60 chars is a **bug** — split it into a primary cue + a follow-up that fires after acknowledgment.

---

## 3. Voice and tone

**Do:**
- Lead with the action verb: `"Leave in 6 min?"` not `"You should leave in 6 min?"`
- Use specific numbers and proper nouns: `"6 min"`, `"9:00"`, `"Alex"` — not `"soon"`, `"shortly"`, `"your teammate"`.
- End `suggest` and `ask_permission` cues with `?` — softens the ask, makes ignoring the cue feel costless.
- End `execute_preapproved` confirmations with `.` — closes the loop without inviting a response.
- Use sentence case (capitalize first word + proper nouns only).

**Don't:**
- ❌ Exclamation marks (`"Leave now!"` reads as urgent/stressful — we are explicitly avoiding the alarm aesthetic).
- ❌ ALL CAPS (same reason).
- ❌ Emoji (legibility on the HUD is poor; also reads as toy-like, not adult-tool).
- ❌ Self-reference (`"I think you should…"`, `"AIR suggests…"`) — be impersonal and direct.
- ❌ Hedges (`"Maybe consider…"`, `"You might want to…"`) — they add chars without value.
- ❌ Reasoning inline (`"Leave in 6 min because traffic is bad and your meeting is at 9"` → just `"Leave in 6 min?"`; reasoning belongs in the audit log / tap-to-expand).

---

## 4. Templates by decision type

The `PolicyEngine` returns one of five decisions. Each maps to a specific cue shape:

### `ignore` → **no cue**
Render nothing. The user must not be able to tell the system was even evaluating.

### `remember` → **no cue**
Silent capture. The HUD stays blank; the memory enters `MemoryStore` with `confidence`/`sensitivity`/`expires_or_revalidates` fields (per AIR-010 schema). Resurfacing is a *separate* event that fires its own `suggest` later — see § 5 Flow 2.

### `suggest` → `"<action>?"`
Non-blocking nudge. User can dismiss with a head-shake or wait it out.

| Trigger | Cue |
|---|---|
| Departure soon | `"Leave in 6 min?"` |
| Routine-prep reminder | `"Bring charger?"` |
| Weather signal | `"Pack umbrella?"` |
| Calendar prep | `"Slack standup in 2 min?"` |
| Travel-prep reminder | `"Pack badge — lab today?"` |

### `ask_permission` → `"<action verbed>?"`
The agent wants to *do something on the user's behalf*. Cue must make the action concrete. User says yes (tap or "yes"), no (tap or "no"), or ignores (timeout = no).

| Trigger | Cue |
|---|---|
| Running late, has known recipient | `"Text Alex you're 5 min late?"` |
| Reply to known message | `"Reply 'on my way'?"` |
| Navigation | `"Open route to office?"` |
| Focus mode | `"Snooze focus until 10am?"` |
| Calendar action | `"Decline 3pm sync — conflict?"` |

### `execute_preapproved` → `"<status>."`
Action already happened (user pre-approved this category). Cue is post-hoc confirmation, not a question. Keep ≤ 20 chars.

| Trigger | Cue |
|---|---|
| Route opened | `"Route ready."` |
| Reminder created | `"Reminder set: 8:30am."` |
| Message sent (pre-approved) | `"Texted Alex."` |
| DND toggled | `"On Slack DND."` |
| Calendar updated | `"3pm sync declined."` |

---

## 5. Demo flow cues (canonical strings for AIR-022 and AIR-023)

These are the exact strings the demo runner should emit. Sebastian / Codex: copy from here, don't paraphrase.

### Flow 1 — Leaving Mode (already wired in `src/demo/leaving_mode.ts`)

| Step | Decision | Cue |
|---|---|---|
| 8:24am, calendar event at 9:00am, 28-min travel | `suggest` | `"Leave in 6 min for 9:00 class?"` *(31 chars)* |
| User says "yes" | `execute_preapproved` (chained) | `"Route ready. Bring charger?"` *(27 chars, two-statement)* |
| User says "yes" again | `execute_preapproved` | `"Reminder set."` |

### Flow 2 — Memory Capture (target for AIR-022)

| Step | Decision | Cue |
|---|---|---|
| User says "I should remember to ask Victor about the latency issue" | `remember` | *(no cue — silent capture)* |
| Later, user opens laptop / enters work context | `suggest` | `"Ask Victor about latency?"` *(25 chars)* |
| User says "yes" + dictates message | `ask_permission` | `"Text Victor re: latency issue?"` *(31 chars)* |
| User confirms | `execute_preapproved` | `"Texted Victor."` |

### Flow 3 — Consentful Action (target for AIR-023)

| Step | Decision | Cue |
|---|---|---|
| Travel time + calendar shows user will be late | `ask_permission` | `"Running 5 min late. Text Alex?"` *(31 chars)* |
| User says "yes" | `execute_preapproved` | `"Texted Alex."` |
| User says "no" or dismisses | (silent) | *(no cue — respect the dismissal)* |

---

## 6. Anti-patterns (real examples, all rejected)

| ❌ Don't | ✅ Do | Why |
|---|---|---|
| `"Hey! Looks like you should probably leave in about 6 minutes!"` | `"Leave in 6 min?"` | Hedges, exclamation, fluff. |
| `"AIR has detected a potential delay in your morning routine"` | `"Leave in 6 min?"` | Self-reference, vague, no actionable. |
| `"You usually bring your laptop charger on Mondays — want a reminder?"` | `"Bring charger?"` | Reasoning belongs in audit log, not the cue. |
| `"⚠️ URGENT: TRAFFIC DETECTED"` | `"Leave in 4 min — traffic."` | No emoji, no caps; specificity over alarm. |
| `"I'll send Alex a message saying you're running late, okay?"` | `"Text Alex you're 5 min late?"` | First-person, conversational; we're a HUD not a chatbot. |

---

## 7. Localization

Out of scope for the hackathon prototype. All copy is English. If we ship beyond hackathon, localized strings live in `src/copy/<locale>.ts` keyed by template name (e.g., `suggest.depart_in`).

---

## 8. G2 hardware notes

The Even G2 SDK constrains how a cue actually surfaces. See `docs/g2-alignment.md` for the full audit.

- **One event-capture container per page.** A cue must be a *single* text container — not separate yes / no buttons. Yes-vs-no is a tap-state distinction inside that container.
- **Yes** = `CLICK_EVENT`. **No** = `DOUBLE_CLICK_EVENT` *or* a 4-second timeout (silent dismiss). Calibrate on hardware.
- **Update primitive** = `bridge.textContainerUpgrade(...)` for low-flicker text swaps. Use this when chaining cues (`"Running 5 min late. Text Alex?"` → `"Texted Alex."`) to avoid flicker.
- **Char budget on the wire** is much higher than our copy budget — `textContainerUpgrade` accepts up to 2,000 chars. Our ≤ 40 char target is a *legibility* constraint, not an SDK limit.
- **Greyscale only**: 4-bit (16 levels of green). No color reliance in copy.

## 9. Where copy lives in code

Once these strings are wired into the orchestrator, they live in:
- `src/copy/cues.ts` (proposed — does not yet exist) — exports a `cues` object keyed by template name with parameter substitution: `cues.suggest.depart_in({ minutes: 6, event: '9:00 class' })` returns `"Leave in 6 min for 9:00 class?"`.
- Existing demo seeds in `src/demo/*.ts` should reference `cues.*`, never hardcode strings.

This is a Sebastian task once AIR-022 / AIR-023 unblock — flag in HANDOFF.md when ready.
