# Context schema

Source-of-truth for every typed object that flows between modules. If `src/` ever needs a shape, it should match a definition here. **Update this doc *before* changing a type in code.**

Owner: Nick. Implementation in `src/context/types.ts`, `src/memory/store.ts`, `src/salience/engine.ts`, `src/policy/engine.ts`, `src/actions/types.ts` should track this file.

> Status: spec. Sebastian's baseline has minimal versions of `ContextEvent`, `SalienceScore`, and `PolicyAction`. The expansions below are what **AIR-024** (salience refinement), **AIR-022** (memory-capture impl), and **AIR-023** (consentful-action impl) will require.

---

## 1. `ContextEvent` — the input

A single observed signal from a sensor, app, or user utterance. The orchestrator's only entry point is `ingestContextEvent(event)`.

```ts
type ContextEvent = {
  id: string;                          // UUID
  kind: ContextEventKind;
  source: ContextSource;
  timestamp: string;                   // ISO-8601
  payload: Record<string, unknown>;    // event-kind-specific
  confidence?: number;                 // 0..1, source's own
  privacy_risk?: number;               // 0..1, see § 6
  user_id?: string;                    // multi-user later
};

type ContextEventKind =
  | "departure_signal"          // calendar + travel-time computed an upcoming exit
  | "voice_mention"             // user said something the agent caught
  | "calendar_event_upcoming"   // meeting/class within the horizon
  | "location_change"           // crossed a known geofence
  | "communication_received"    // inbound message
  | "routine_pattern_match"     // matched a learned pattern
  | string;                     // extensible — flag in HANDOFF.md before adding

type ContextSource =
  | "calendar" | "location" | "voice"
  | "device_sensor" | "messaging" | "manual"
  | "even_g2" | "mock_calendar"   // adapter IDs from src/adapters/
  | "memory";                     // synthetic kind: "memory_resurfaced"
```

**Conventions:**
- `payload` is event-kind-specific; document keys in code via discriminated unions.
- `confidence` is what *the source* claims (e.g. speech-to-text's transcription confidence). It is *not* the agent's confidence in salience — that's separate.
- `privacy_risk` is the *category-level* sensitivity of the data (location > voice > calendar metadata). Per-event overrides are possible (e.g., a voice mention near a known sensitive person).
- For `kind: "voice_mention"`, `payload.transcript: string` is **populated by the ingesting adapter** (e.g., `EvenG2BridgeAdapter`), not by the user. Raw audio frames are not exposed to the engine — see `docs/g2-alignment.md` § "Audio".

**Diff from baseline:** baseline has `kind: string` (un-typed), no `user_id`. Tighten when AIR-022 lands.

---

## 2. `MemoryRecord` — what we keep

The output of the `remember` decision. Memory is structured, governed, and *expirable* — never a raw vector dump.

```ts
type MemoryRecord = {
  id: string;
  eventId: string;
  summary: string;                     // human-readable, <= 140 chars
  createdAt: string;                   // ISO-8601

  // --- Governance (from pitch.md memory example) ---
  confidence: number;                  // 0..1
  sensitivity: SensitivityLevel;
  allowed_actions: PolicyAction[];     // which decisions may consume this
  requires_confirmation_for: PolicyAction[];   // even if allowed, ask first
  expires_or_revalidates: string;      // ISO-8601 — drop or revalidate after

  // --- Resurfacing (Flow 2) ---
  resurface_triggers?: ResurfaceTrigger[];
  last_resurfaced?: string;            // ISO-8601, used for cooldowns
};

type SensitivityLevel = "low" | "medium" | "high" | "critical";

type ResurfaceTrigger =
  | { kind: "calendar_event"; match: { title_contains?: string; within_minutes?: number } }
  | { kind: "location";       match: { place_id: string } }
  | { kind: "time_window";    match: { weekday?: number; hour_start: number; hour_end: number } }
  | { kind: "person_mention"; match: { person: string } };
```

**Diff from baseline:** baseline `MemoryRecord` is `{ id, eventId, summary, createdAt }` only. Governance fields are net-new and required for Flow 2 (AIR-022).

---

## 3. `SalienceScore` — the dimensional evaluation

What the salience engine produces, given a `ContextEvent` + current context state.

```ts
type SalienceScore = {
  urgency: number;        // 0..1 — how time-sensitive
  confidence: number;     // 0..1 — agent's confidence this matters now
  user_value: number;     // 0..1 — likelihood user would want this
  annoyance_cost: number; // 0..1 — disturbance penalty if surfaced
  privacy_risk: number;   // 0..1
  reversibility: number;  // 0..1 — can the resulting action be undone (1 = fully)
};

type SalienceComposite = {
  components: SalienceScore;
  total: number;          // weighted sum, see docs/policy-rules.md
};
```

**Diff from baseline:** baseline `SalienceScore` lacks `reversibility`. Adding it is part of **AIR-024**.

---

## 4. `PolicyDecision` — what we chose to do

The output of `PolicyEngine.decide(event, score)`. One per input event.

```ts
type PolicyAction =
  | "ignore"
  | "remember"
  | "suggest"
  | "ask_permission"
  | "execute_preapproved";

type PolicyDecision = {
  eventId: string;
  action: PolicyAction;
  score: SalienceComposite;
  cue?: SuggestedAction;          // present iff action ∈ { suggest, ask_permission, execute_preapproved }
  reason: string;                 // structured reason code, see § 7
  cooldown_state: CooldownState;
  decidedAt: string;              // ISO-8601
};

type CooldownState = {
  in_cooldown: boolean;
  last_interrupt_at?: string;
  next_eligible_at?: string;      // when the next non-`ignore`/`remember` action is allowed
};
```

**Diff from baseline:** baseline returns just the action enum. Adding `score`, `cue`, `reason`, `cooldown_state` is part of **AIR-025** (cooldown) + audit-log work in AIR-014 (privacy).

---

## 5. `SuggestedAction` — the cue and its follow-up

Present whenever a decision generates HUD output. Must reference a template from `docs/glasses-cue-copy.md`.

```ts
type SuggestedAction = {
  cue: string;                            // rendered string, ≤ 60 chars
  template_id: string;                    // e.g., "suggest.depart_in"
  parameters: Record<string, unknown>;    // template fill values

  followup?: {
    on_yes: PolicyAction[];               // chained decisions to execute on confirm
    on_no:
      | { kind: "silent" }
      | { kind: "remember_as"; record: Partial<MemoryRecord> };
  };

  expires_at: string;                     // when the HUD should clear the cue (≤ 4s typical)
};
```

---

## 6. `UserPermission` — consent boundaries

Per-user state that the policy engine consults *before* deciding `ask_permission` vs. `execute_preapproved`.

```ts
type UserPermission = {
  user_id: string;
  preapprovals: Preapproval[];
  blanket_denials: BlanketDenial[];
  privacy_categories: PrivacyCategoryConfig[];
};

type Preapproval = {
  id: string;
  action_template: string;        // e.g., "send_message_running_late"
  scope: PreapprovalScope;
  granted_at: string;
  expires_at?: string;
  revoked_at?: string;
};

type PreapprovalScope = {
  recipients?: string[];          // e.g. ["alex@example.com"]
  contexts?: string[];            // e.g. ["calendar_running_late"]
  max_per_day?: number;
};

type BlanketDenial = {
  action_kind: string;            // e.g. "purchase"
  reason?: string;
  set_at: string;
};

type PrivacyCategoryConfig = {
  category: "location" | "voice" | "messaging" | "biometric" | "calendar";
  collection_allowed: boolean;
  retention_days: number;
};
```

**Diff from baseline:** does not exist in baseline. Required for **AIR-023** (consentful-action) and **AIR-014** (privacy model).

---

## 7. Reason codes

Every `PolicyDecision.reason` should be a structured slug, not free text. Used for the audit log and explainability ("why did this cue appear?").

| Code | Meaning |
|---|---|
| `score_below_ignore_threshold` | Composite < 0.30 |
| `cooldown_active` | Decision downgraded due to interruption budget |
| `policy_pre_approved` | Matched a `Preapproval`, executed silently |
| `policy_consent_required` | Action exists in `requires_confirmation_for` |
| `memory_governance_blocked` | Memory's `allowed_actions` excluded the proposed action |
| `privacy_risk_too_high` | `privacy_risk` ≥ 0.8 — escalated to ask_permission |
| `salience_high_user_value` | Standard suggest path |
| `memory_resurfaced` | Decision came from a Flow-2 resurface trigger, not a new event |

---

## 8. Three worked examples

### Example A — Leaving Mode → `suggest`

**Input:**
```ts
const event: ContextEvent = {
  id: "evt_01",
  kind: "departure_signal",
  source: "calendar",
  timestamp: "2026-04-26T15:24:00Z",
  payload: { minutes_to_departure: 6, destination: "office", calendar_event: "9:00 class" },
  confidence: 0.92,
  privacy_risk: 0.2,
};
```

**Salience output:**
```ts
{ urgency: 0.90, confidence: 0.92, user_value: 0.85, annoyance_cost: 0.20, privacy_risk: 0.20, reversibility: 1.0 }
// total = 0.35*0.90 + 0.25*0.92 + 0.20*0.85 + 0.10*1.0 - 0.25*0.20 - 0.30*0.20 = 0.625
```

**Decision:**
```ts
{
  eventId: "evt_01",
  action: "suggest",
  score: { components: { ... }, total: 0.625 },
  cue: {
    cue: "Leave in 6 min for 9:00 class?",
    template_id: "suggest.depart_in_for",
    parameters: { minutes: 6, event: "9:00 class" },
    followup: { on_yes: ["execute_preapproved"], on_no: { kind: "silent" } },
    expires_at: "2026-04-26T15:24:04Z",
  },
  reason: "salience_high_user_value",
  cooldown_state: { in_cooldown: false },
  decidedAt: "2026-04-26T15:24:00Z",
}
```

### Example B — Voice mention → `remember`

**Input:**
```ts
const event: ContextEvent = {
  id: "evt_02",
  kind: "voice_mention",
  source: "voice",
  timestamp: "2026-04-26T18:10:00Z",
  payload: { transcript: "I should remember to ask Victor about the latency issue", intent: "self_reminder" },
  confidence: 0.81,
  privacy_risk: 0.4,
};
```

**Decision:**
```ts
{
  eventId: "evt_02",
  action: "remember",
  score: { components: { urgency: 0.10, confidence: 0.81, user_value: 0.65, annoyance_cost: 0.30, privacy_risk: 0.40, reversibility: 1.0 }, total: 0.42 },
  cue: undefined,                           // remember = silent
  reason: "salience_high_user_value",
  cooldown_state: { in_cooldown: false },
  decidedAt: "2026-04-26T18:10:00Z",
}
```

**Memory created (side effect):**
```ts
{
  id: "mem_01",
  eventId: "evt_02",
  summary: "Ask Victor about latency issue",
  createdAt: "2026-04-26T18:10:00Z",
  confidence: 0.81,
  sensitivity: "low",
  allowed_actions: ["suggest", "ask_permission"],
  requires_confirmation_for: ["execute_preapproved"],
  expires_or_revalidates: "2026-05-26T18:10:00Z",
  resurface_triggers: [
    { kind: "person_mention", match: { person: "Victor" } },
    { kind: "calendar_event", match: { title_contains: "latency", within_minutes: 1440 } },
  ],
}
```

### Example C — Running late → `ask_permission`

**Input:**
```ts
const event: ContextEvent = {
  id: "evt_03",
  kind: "calendar_event_upcoming",
  source: "calendar",
  timestamp: "2026-04-26T16:55:00Z",
  payload: { event: "3pm sync", minutes_to_event: -5, attendees: ["alex@example.com"] },
  confidence: 0.95,
  privacy_risk: 0.3,
};
```

**Decision (with no preapproval present):**
```ts
{
  eventId: "evt_03",
  action: "ask_permission",
  score: { components: { urgency: 0.95, confidence: 0.95, user_value: 0.80, annoyance_cost: 0.40, privacy_risk: 0.30, reversibility: 0.5 }, total: 0.745 },
  cue: {
    cue: "Running 5 min late. Text Alex?",
    template_id: "ask.send_running_late",
    parameters: { minutes: 5, recipient: "Alex" },
    followup: { on_yes: ["execute_preapproved"], on_no: { kind: "silent" } },
    expires_at: "2026-04-26T16:55:05Z",
  },
  reason: "policy_consent_required",
  cooldown_state: { in_cooldown: false },
  decidedAt: "2026-04-26T16:55:00Z",
}
```

If the user has a `Preapproval` matching `action_template: "send_message_running_late"` with `recipients: ["alex@example.com"]`, the decision becomes `execute_preapproved` and the cue switches to `"Texted Alex."` with no question mark.

---

## 9. Implementation handoff

For Sebastian, when AIR-022/023/024/025 are picked up:

1. Update `src/context/types.ts` to extend `ContextEvent` with `user_id` and tighten `kind` to a discriminated union.
2. Replace `src/memory/store.ts` `MemoryRecord` with the governed version above. Add `resurface_triggers` index.
3. Add `reversibility: number` to `SalienceScore` in `src/salience/engine.ts`.
4. Extend `PolicyDecision` (currently just an enum) to the full structured object in `src/actions/types.ts` (or a new `src/policy/types.ts`).
5. Add `src/permissions/types.ts` and a (in-memory for hackathon) `PermissionStore`.

Tests should be updated together — this is a breaking schema change, not an additive one. Track in HANDOFF.md when in flight.
