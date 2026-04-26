# Flow 2 — Memory Capture

The second demo flow. The user makes a casual self-reminder out loud while doing something else; AIR captures it silently with full governance metadata; later, when the right context reappears, AIR resurfaces it as a `suggest`.

This file is the source-of-truth for **AIR-022** (implementation). Sebastian: copy the strings, types, and pipeline below verbatim.

> Reads: `docs/context-schema.md` (especially `MemoryRecord` § 2 and `ResurfaceTrigger`), `docs/policy-rules.md` § 5 (memory governance), `docs/glasses-cue-copy.md`. Don't change behavior without updating those upstream first.

---

## 1. Scenario

**6:10 PM.** The user is making coffee and says aloud: *"I should remember to ask Victor about the latency issue."*

A `voice_mention` event is generated. AIR's salience engine returns a moderate composite (~0.42): the urgency is low (not "now"), but confidence is reasonable (intent words "I should remember" are explicit), user_value is moderate (this is an actionable self-reminder). The threshold gate places it in the `0.30 ≤ total < 0.50` band → `remember`.

**HUD output: nothing.** The user's eyeline is unobstructed. The agent's only sign of life is a `MemoryRecord` quietly entering the store.

**Next morning, 9:15 AM.** The user opens their laptop and a calendar event "1:1 with Victor" appears within the next 15 minutes. The system fires a `calendar_event_upcoming` event with `payload.attendees` including "Victor."

This calendar event matches a `ResurfaceTrigger` on the stored memory: `{ kind: "person_mention", match: { person: "Victor" } }`. The memory is read back, used to construct a synthetic `ContextEvent` with `kind: "memory_resurfaced"`, and the policy pipeline runs again — this time with the memory's governance constraints applied.

Composite: ~0.62. Memory's `allowed_actions: ["suggest", "ask_permission"]`. Threshold proposes `suggest` (0.50–0.70 band). Allowed by governance. No cooldown active.

**HUD output: `"Ask Victor about latency?"`** — the canonical resurface cue.

User taps yes → AIR fires a follow-up `ask_permission` cue: `"Text Victor re: latency issue?"` → on yes → drafts and sends → confirms `"Texted Victor."` This second arc is the same pipeline as Flow 3.

---

## 2. Why this earns the "memory" framing

A typical memory demo dumps every utterance into a vector store and lets retrieval-augmented generation fish things out later. That's not memory — that's a logging pipeline.

AIR's memory:
1. **Decides what's worth keeping** (`remember` is a *deliberate* policy decision, not an automatic capture).
2. **Tags every record with governance** (`sensitivity`, `allowed_actions`, `requires_confirmation_for`, `expires_or_revalidates`).
3. **Resurfaces on context match, not on similarity search** — a calendar event involving Victor triggers it; "what did the user say last Tuesday?" does not.
4. **Decays** — the default `expires_or_revalidates` is 30 days for low-sensitivity, 7 days with re-prompt for high-sensitivity (per `docs/privacy-model.md` § 3).

The judge sees a memory created silently, surfaced 12 hours later because of a *meaningful* trigger, with the engine's reason chain visible in the audit log. That's the differentiator.

---

## 3. Capture pipeline (the silent step)

```
ContextEvent { kind: "voice_mention", payload: { transcript, intent: "self_reminder" } }
  ↓
SalienceEngine → composite ≈ 0.42
  ↓
Threshold gate → remember (0.30 ≤ 0.42 < 0.50)
  ↓
Privacy override → privacy_risk = 0.40, no escalation
  ↓
Memory governance → not a resurface; pass-through
  ↓
Cooldown gate → remember actions are budget-free; pass-through
  ↓
Permission lookup → not applicable (no action being executed)
  ↓
PolicyDecision { action: "remember", cue: undefined, reason: "salience_high_user_value" }
  ↓
Side effect: MemoryStore.remember(event, summary)
  → MemoryRecord with { allowed_actions, requires_confirmation_for, resurface_triggers, expires_or_revalidates }
```

### How the side-effect builds the MemoryRecord

The memory store is responsible for inferring metadata from the event:

| Field | How it's derived |
|---|---|
| `summary` | Distilled from `payload.transcript`. Drop the "I should remember to" prefix. Keep the actionable noun phrase. ≤ 140 chars. |
| `confidence` | Carry over `event.confidence`. |
| `sensitivity` | Default `"low"` for voice mentions with `intent: "self_reminder"`. Bump to `"medium"` if transcript matches a known sensitive keyword list. |
| `allowed_actions` | `["suggest", "ask_permission"]` by default. Excludes `execute_preapproved` (silent action on a casual mention is wrong). |
| `requires_confirmation_for` | `["execute_preapproved"]` — even after a future preapproval, this memory's content gets re-confirmed. |
| `expires_or_revalidates` | `now + 30 days` for low-sensitivity. |
| `resurface_triggers` | Inferred from transcript: extract proper nouns ("Victor"), domain nouns ("latency"), and emit triggers (see § 4). |

---

## 4. Resurface triggers — how memories find their moment

A `MemoryRecord` carries one or more triggers. Each trigger has a `kind` and a `match` predicate. The store maintains an index keyed by trigger kind so incoming events can be cheaply checked.

| Kind | Match shape | Use case |
|---|---|---|
| `person_mention` | `{ person: string }` | Memory mentions a person; fire when that person appears in calendar attendees, an inbound message, or a future voice mention. |
| `calendar_event` | `{ title_contains?: string; within_minutes?: number }` | Memory is topical to a meeting; fire when a calendar event matching the substring is within N minutes. |
| `location` | `{ place_id: string }` | Memory is location-bound (e.g. "buy milk on the way home"); fire on geofence enter. |
| `time_window` | `{ weekday?: number; hour_start: number; hour_end: number }` | Memory is time-of-day bound (e.g. "morning routine reminder"); fire when current time enters the window. |

For the **Victor latency** memory, the trigger inference is:
- `person_mention: { person: "Victor" }` — primary
- `calendar_event: { title_contains: "latency", within_minutes: 1440 }` — secondary

When ANY of the triggers matches, the memory is selected. A scored event of `kind: "memory_resurfaced"` is constructed from the memory + the triggering event; this synthetic event re-enters the salience pipeline with the memory's governance constraints attached.

---

## 5. Resurface pipeline (the visible step)

When a calendar event arrives that matches a stored memory's trigger:

```
Incoming: ContextEvent { kind: "calendar_event_upcoming", attendees: ["Victor"] }
  ↓
MemoryStore.findResurfaceCandidates(event)
  → returns matching MemoryRecord(s)
  ↓
For each candidate, construct synthetic ContextEvent { kind: "memory_resurfaced", payload: { memory_id, triggering_event_id } }
  ↓
SalienceEngine → composite ≈ 0.62 (boosted by user_value because the memory was preserved)
  ↓
Threshold gate → suggest
  ↓
Memory governance gate → suggest is in allowed_actions; pass-through
  ↓
Cooldown gate → check budget; downgrade to remember if exhausted (memory stays, fires next eligible window)
  ↓
PolicyDecision { action: "suggest", cue: "Ask Victor about latency?", reason: "memory_resurfaced" }
```

The synthetic event keeps a reference to both the memory and the triggering event in `payload`. This is what makes "Why this cue?" answerable — the audit log shows the chain: original utterance → memory created → trigger event → resurface decision.

---

## 6. Cue strings (canon, do not paraphrase)

From `docs/glasses-cue-copy.md` § 5:

| Step | Decision | Cue |
|---|---|---|
| Casual capture | `remember` | *(silent — no cue)* |
| Resurface as suggestion | `suggest` | `"Ask Victor about latency?"` |
| User taps yes; agent offers to send | `ask_permission` | `"Text Victor re: latency issue?"` |
| User confirms send | `execute_preapproved` | `"Texted Victor."` |

If the user dismisses the resurface cue (taps no or times out), the memory's `last_resurfaced` timestamp is still updated. This prevents re-firing on every subsequent matching event. A second resurface attempt requires a *new* trigger or a manual revisit from settings.

---

## 7. Failure modes

| Failure | Mitigation |
|---|---|
| Memory captured for a private utterance the user didn't intend to remember | `intent: "self_reminder"` filter — only mentions matching explicit reminder phrasing become memories. Other voice mentions might be ignored or kept locally for one decision cycle, not persisted. |
| Resurface fires at a bad time (e.g. user is in active conversation) | Cooldown gate + per-context interruption budget (post-hackathon: a "user is talking" signal could disable cues entirely). |
| Memory becomes stale (e.g. issue with Victor was resolved last week) | `expires_or_revalidates` lapses → memory drops; if user wants to keep it, system can re-prompt at expiry. |
| Trigger inference is wrong (e.g. the wrong "Victor") | Triggers carry confidence; below-threshold triggers downgrade `suggest` to `remember` (no cue), forcing a re-validation event. |
| User keeps dismissing a recurring resurface | Track dismiss count per memory; auto-expire after 3 dismisses with no accept. |

---

## 8. Implementation handoff (for Sebastian, AIR-022)

`src/demo/memory_capture.ts` (new — copy `src/demo/leaving_mode.ts` pattern). What it does:

1. Seeds the **capture event** (voice_mention with the canonical transcript).
2. Calls `orchestrator.ingestEvent(captureEvent)` and asserts `decision.action === "remember"`.
3. Asserts `MemoryStore.list()` now contains the new record with the right governance fields.
4. Seeds the **trigger event** (calendar_event_upcoming with Victor as attendee).
5. Calls `orchestrator.ingestEvent(triggerEvent)`.
6. Asserts the orchestrator surfaced the memory and produced a second decision with `action: "suggest"`, `reason: "memory_resurfaced"`, cue: `"Ask Victor about latency?"`.

Required surface in `src/memory/store.ts` (extend the placeholder):
- `findResurfaceCandidates(event: ContextEvent): MemoryRecord[]` — checks indexed triggers.
- `markResurfaced(memoryId: string, at: string)`.

Required surface in `src/api/orchestrator.ts`:
- After `ingestEvent`, run `findResurfaceCandidates` and re-ingest each match as a synthetic event. Avoid infinite loops by capping recursion to 1.

API endpoint: add `POST /demo/memory-capture` mirroring `/demo/leaving-mode`. The endpoint accepts `{ scenario: "victor_latency" }` and runs the seeded sequence.

Tests: `tests/flow-memory-capture.test.ts` covering capture, trigger match, dismiss, and trigger-no-match.

Flag in HANDOFF.md when starting. The schema additions to `MemoryRecord` (per `docs/context-schema.md` § 2) are a prerequisite — those are part of this same task.
