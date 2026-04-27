# Policy rules

How the policy engine turns a `SalienceScore` into one of `{ ignore, remember, suggest, ask_permission, execute_preapproved }`. This file is the spec; `src/policy/engine.ts` should track it.

Owner: Nick. Implementation in `src/policy/engine.ts` (currently uses placeholder thresholds; refactor under **AIR-024** + **AIR-025**).

> Read `docs/context-schema.md` first for the type definitions referenced here.

---

## 1. The pipeline

```
ContextEvent
  ↓
SalienceEngine ─────────── produces SalienceScore (six 0..1 components)
  ↓
Composite scoring ──────── produces total (weighted sum)
  ↓
Threshold gating ───────── proposes a PolicyAction
  ↓
Privacy override ───────── force-escalate if privacy_risk ≥ 0.8
  ↓
Memory governance ─────── filter by MemoryRecord.allowed_actions (Flow 2)
  ↓
Cooldown gate ──────────── downgrade if interruption budget exhausted
  ↓
Permission lookup ──────── upgrade ask_permission → execute_preapproved if pre-approved
  ↓
PolicyDecision (with cue, reason, cooldown_state)
```

Six gates, executed in this order. Each gate can downgrade the action (toward `ignore`) but only the **permission lookup** can upgrade it.

---

## 2. Composite scoring

```
total = 0.35 * urgency
      + 0.25 * confidence
      + 0.20 * user_value
      + 0.10 * reversibility
      − 0.25 * annoyance_cost
      − 0.30 * privacy_risk
```

Weights sum to +0.90 / −0.55 = net +0.35 across positives, so `total` is bounded in `[−0.55, +0.90]`. Clamp to `[0, 1]` at the end (negative inputs should not happen — they'd indicate a salience-engine bug).

Source: `pitch.md` § "interruption scoring."

---

## 2.1 Conceptual ladder (L0–L5)

The five-value `PolicyAction` enum is the *enforced* contract. The six-rung ladder below is the *teaching frame* — it's how to reason about what the engine is allowed to do at each rung, including the implicit "Prepare" sub-step that lives inside `ask_permission`.

| Rung | What it means | Maps to `PolicyAction` | Example |
|---|---|---|---|
| **L0** | Observe only | `ignore` | "User mentioned they may be late." → no output, no memory. |
| **L1** | Remember | `remember` | "Store that Monday meetings tend to run over." |
| **L2** | Suggest | `suggest` | `"Leave in 10 min for 9:00 class?"` |
| **L3** | Prepare (no surface) | sub-step of `ask_permission` | Draft the text-to-teammate body so the next rung is one tap away. |
| **L4** | Execute with confirmation | `ask_permission` | `"Text Alex you're 5 min late?"` |
| **L5** | Execute automatically | `execute_preapproved` | Only when a `Preapproval` matches and privacy override didn't fire. |

L3 doesn't have its own enum value because nothing leaves the engine at L3 — the prepared payload rides inside the `SuggestedAction.followup` of an L4 cue. The reason it's a named rung anyway: it's the gate where the action template + its parameters get resolved, so by the time the user sees the L4 question, the answer is already one bit (`yes`/`no`) instead of a form-fill.

The ladder is also why AIR is "permissioned" rather than "permissioned + capable": every rung above L0 is an *earned* upgrade. L1 needs salience above 0.30 *and* memory governance to not block. L2 needs salience above 0.50 *and* cooldown room. L4 needs salience above 0.70 *and* privacy override not to fire. L5 needs an active `Preapproval`. Nothing skips a rung.

---

## 3. Threshold gating

| `total` | Proposed action | Notes |
|---|---|---|
| `< 0.30` | `ignore` | Render nothing. Do not even log unless privacy-relevant. |
| `0.30 ≤ total < 0.50` | `remember` | Silent capture into `MemoryStore` (with governance fields per AIR-010). |
| `0.50 ≤ total < 0.70` | `suggest` | HUD cue per `docs/glasses-cue-copy.md` § `suggest`. |
| `0.70 ≤ total < 0.90` | `ask_permission` | HUD cue per § `ask_permission`. |
| `total ≥ 0.90` | `execute_preapproved` | Only if a `Preapproval` matches; otherwise downgrade to `ask_permission`. |

These cutoffs are **exact** — they're how the demo will be calibrated. Don't fuzz them in code without updating this file.

---

## 4. Privacy override

If `score.components.privacy_risk ≥ 0.80`, the proposed action is force-escalated to `ask_permission` (regardless of any other gate). Reason code: `privacy_risk_too_high`.

Rationale: a high-privacy event should never be acted on silently or executed automatically, even with preapproval. The user must see and confirm.

Exception: `ignore` and `remember` are not affected. A high-privacy event can still be ignored or silently captured (subject to memory governance).

---

## 5. Memory governance (Flow 2)

When a decision is being made *because of a resurfaced memory* (i.e., the event came from a `ResurfaceTrigger` matching an existing `MemoryRecord`), the memory's governance fields gate the decision:

- If `proposed_action` is **not in** `memory.allowed_actions` → downgrade to the highest action that is. If none, drop to `ignore`. Reason code: `memory_governance_blocked`.
- If `proposed_action` is **in** `memory.requires_confirmation_for` → escalate to `ask_permission` (even if user has a relevant preapproval). Reason code: `policy_consent_required`.
- If `memory.expires_or_revalidates < now` → drop to `ignore`, mark memory for revalidation.

This guarantees a memory tagged `sensitivity: "high"` with `allowed_actions: ["suggest"]` cannot be used to silently execute an action, no matter how confident the salience engine becomes.

---

## 6. Cooldown / interruption budget

The trust-critical gate (per pitch §6: "Over-notification reduces trust").

### 6.1 Default budgets

| Action class | Max per rolling window | Window |
|---|---|---|
| `suggest` + `ask_permission` (combined) | 1 | 10 minutes |
| `execute_preapproved` | unlimited | — |
| `remember` | unlimited | — |
| `ignore` | unlimited | — |

These are defaults for the hackathon demo. Production values would come from per-user calibration.

### 6.2 Cooldown downgrade rule

If the proposed action is `suggest` or `ask_permission` AND the user has had a `suggest`/`ask_permission` cue within the last 10 minutes:
- Downgrade to `remember`. Reason code: `cooldown_active`.
- Set `cooldown_state.next_eligible_at` = `last_interrupt_at + 10 min`.
- The remembered fact gets `resurface_triggers` set to fire at `next_eligible_at`, so it isn't lost.

### 6.3 Cooldown reset

`last_interrupt_at` updates on the first non-`ignore`/`remember` decision. It does *not* update when a downgrade happens — only when an actual cue is shown.

### 6.4 Per-category budgets (post-hackathon)

Out of scope for v0. Eventually each `kind`/template would have its own budget so a "running late" cue and a "leave for class" cue don't compete. For now, one global budget.

---

## 7. Permission lookup

Runs *only* if proposed action is `execute_preapproved` (after threshold + privacy + memory + cooldown gates).

1. Look up `UserPermission.preapprovals` for the current user.
2. Find a `Preapproval` where:
   - `action_template === cue.template_id`, AND
   - scope matches event payload (e.g., `recipients` includes the message recipient), AND
   - `revoked_at` is null, `expires_at` is in future, AND
   - daily count under `max_per_day`.
3. If found → action stays `execute_preapproved`, reason `policy_pre_approved`.
4. If not found → downgrade to `ask_permission`, reason `policy_consent_required`.

Also check `UserPermission.blanket_denials`: if any matches, drop to `ignore` regardless of score. Reason code: `blanket_denial`.

---

## 8. Worked walk-throughs

### Walk-through A — Two suggests in 5 minutes

Event 1: `departure_signal`, `total = 0.625` → proposed `suggest` → no overrides → cooldown empty → render `"Leave in 6 min for 9:00 class?"`. Set `last_interrupt_at = now`.

Event 2 (5 min later): `routine_pattern_match` for "bring charger", `total = 0.58` → proposed `suggest` → no overrides → cooldown active (5 min < 10 min window) → **downgrade to `remember`**. Set memory `resurface_triggers: [{ kind: "time_window", match: { hour_start: now+5min } }]` so it fires at `last_interrupt_at + 10min`.

### Walk-through B — High-privacy event with preapproval

Event: `voice_mention` containing financial info, `privacy_risk = 0.85`, `total = 0.92` → proposed `execute_preapproved` → privacy override → **force `ask_permission`**, reason `privacy_risk_too_high`. Even if the user has a preapproval, they must confirm because the data is sensitive.

### Walk-through C — Resurfaced memory blocked by governance

Trigger: `ResurfaceTrigger { kind: "person_mention", match: { person: "Victor" } }` fires from a memory with `allowed_actions: ["suggest"]`, `requires_confirmation_for: ["execute_preapproved"]`. Salience composite is `0.92` (above `execute_preapproved` threshold). 

Pipeline: threshold proposes `execute_preapproved` → memory governance → `execute_preapproved` not in `allowed_actions` → **downgrade to highest allowed = `suggest`**, reason `memory_governance_blocked`. Cue: `"Ask Victor about latency?"`.

This is the safety property that lets us tag memories with sensitivity and trust the engine.

---

## 9. Implementation handoff (for Sebastian, AIR-024 + AIR-025)

`src/policy/engine.ts` currently uses ad-hoc thresholds and has no cooldown. The refactor:

1. Replace the if-ladder with the explicit pipeline in § 1. Each gate is a small function returning `{ action, reason }`.
2. Compute `total` per § 2 (note: `reversibility` not yet in `SalienceScore` — depends on AIR-024).
3. Use the threshold table from § 3 verbatim. No magic numbers.
4. Add cooldown state to the engine's instance (`lastInterruptAt: string | null`).
5. Memory-governance and permission-lookup stages can land as stubs that pass-through; full impl when AIR-022/023 land.
6. Every code path must produce a `reason` from § 7 of `docs/context-schema.md`. Reason codes are part of the audit log.

Tests to update: `tests/policy.test.ts` will need new cases for cooldown, privacy override, and memory governance. Suggest table-driven test fixtures keyed by reason code.
