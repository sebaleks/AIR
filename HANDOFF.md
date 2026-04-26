# HANDOFF — AIR coordination log

> **For agentic tools (Codex, Claude, etc.):** read this file at the start of every session. It tells you what's in flight, what interfaces have been agreed on, and what's blocking each side. **Update it whenever you finish a chunk of work, hit a blocker, or change a shared interface.** Append to the relevant section; keep entries dated and signed (`— Nick (Claude)` or `— Sebastian (Codex)`).
>
> Rule of thumb: if your change would surprise the other agent's next session, it belongs here.

Last updated: **2026-04-26** by Nick (Claude). Latest changes: AIR-022 (Flow 2 memory capture + governance + resurface), AIR-023 (Flow 3 consentful action), AIR-025 (cooldown + full six-gate policy pipeline) all landed on main with 25/25 tests passing. End-to-end flows are working.

---

## ⚠️ Workspace warning for Codex Cloud agents

**Recent failure mode:** Sebastian's Codex Cloud agent has been running in sandboxed "docs-only" workspaces that don't include the full `src/` tree. When this happened with PR #3 (the original baseline), the agent **closed the PR rather than escalating** and recreated only the files it needed for AIR-024 from scratch. ~600 LOC of working code was orphaned on the closed branch.

**For future Codex tasks**, two rules:

1. **Never close a PR you didn't open.** If you can't merge it, log a blocker note in this file and stop. Closing leaves the work invisible.
2. **Verify your workspace has the expected files before starting work.** The current `main` should contain `src/{context,memory,salience,policy,actions,api,demo}/`, `tests/`, and `package.json`. If anything is missing, your checkout is partial — flag it and stop.

If Codex consistently runs in partial workspaces, escalate to Nick — we may need to switch implementation work to a different agent or have Nick do the recovery as he did this time.

---

## In flight

- *(none — AIR-024 landed; AIR-025/022/023 ready to start)*

## Role split

**Original split** (per `works-split.md`):

| Side | Tooling | Owned |
|---|---|---|
| Nick | Claude (Opus 4.7) | Spec docs, narrative, demo script, pitch deck, adversarial review |
| Sebastian | Codex Cloud | Scaffolding, `src/` implementation, tests, persistence, infra |

**Actual split (post-2026-04-26):** Claude (Nick) absorbed implementation work after Sebastian's Codex Cloud agent demonstrated a docs-only workspace failure mode (closed PR #3, recreated only what AIR-024 needed, opened no-op blocker PRs #6 and #7). Sebastian shipped AIR-024 cleanly; everything else (AIR-022, 023, 025, plus the recovery commit) landed via Claude in the same session.

For the rest of the hackathon: **Sebastian's role becomes human review + demo recording + pitch delivery**, not implementation via Codex. Implementation work continues on the Claude side. Revisit post-hackathon.

Task queue (Nick's side) lives in Priority Forge under project `AIR`. Sebastian's side has no equivalent tracker yet — when he picks up a task from this doc, mark it `[in flight — Sebastian]`.

---

## Active branches / PRs

| Branch | Owner | Status | Notes |
|---|---|---|---|
| `main` | shared | baseline | Has README, AGENTS.md, `docs/product-spec.md`. No `src/` yet. |
| `codex/create-initial-baseline-branch-and-pr` | Sebastian | **PR #3 CLOSED (not merged) — files recovered onto main by Nick** | Originally held the scaffold; Sebastian's agent closed the PR rather than resolving conflicts. Nick cherry-picked the missing files onto main with ESM import fixes. Branch can be deleted. |
| `codex/refine-salience-engine-and-add-tests` | Sebastian | **PR #5 MERGED → main (AIR-024)** | Salience formula + reversibility + table-driven tests. ✅ Tests pass. |
| `codex/merge-pr-#3-and-resolve-conflicts` | Sebastian (agent) | **PR #6 OPEN — docs-only blocker log** | Not real progress; agent recording it couldn't merge PR #3. Can be closed. |
| `codex/fix-code-review-bugs` | Sebastian (agent) | **PR #7 OPEN — docs-only blocker log** | Same as PR #6. Can be closed. |
| `nick/rename-code-to-air` | Nick | PR #4 MERGED → baseline branch (now deleted via PR #3 closure) | Rename absorbed into the recovery commit. |
| `codex/create-product-specification-for-senseroute` | Sebastian | merged into main | `docs/product-spec.md` |
| `codex/update-readme-for-hackathon-clarity` | Sebastian | merged into main | README rewrite |

---

## Agreed interfaces (do not break without flagging here)

These are the shared types Sebastian's `src/` and Nick's spec docs both depend on. If you need to change one, write the new shape here first, then update both sides.

### `ContextEvent` (current — `src/context/types.ts`, baseline branch)
```ts
type ContextEvent = {
  id: string;
  kind: string;             // "departure_signal" | "voice_mention" | ...
  source: string;           // "calendar" | "location" | "voice" | ...
  payload: Record<string, unknown>;
  timestamp: string;        // ISO-8601
  confidence?: number;      // 0..1
  privacy_risk?: number;    // 0..1
};
```
**Planned expansion** (AIR-010): add `sensitivity`, `allowed_actions`, `requires_confirmation_for`, `expires_or_revalidates`. Will be spec'd in `docs/context-schema.md` before implementation.

### `SalienceScore` (current — `src/salience/engine.ts`)
```ts
type SalienceScore = {
  urgency: number;
  confidence: number;
  user_value: number;
  annoyance_cost: number;
  privacy_risk: number;
};
```
**Planned**: add `reversibility` per pitch.md formula (AIR-024).

### `PolicyAction` (current — `src/policy/engine.ts`)
```ts
type PolicyAction = "ignore" | "remember" | "suggest" | "ask_permission" | "execute_preapproved";
```
Stable. Don't rename.

### Decision formula (target — to be spec'd in AIR-011, then implemented in AIR-024)
```
score = 0.35*urgency + 0.25*confidence + 0.20*user_value
      + 0.10*reversibility - 0.25*annoyance - 0.30*privacy_risk

score < 0.30          → ignore
0.30 ≤ score < 0.50   → remember
0.50 ≤ score < 0.70   → suggest
0.70 ≤ score < 0.90   → ask_permission
score ≥ 0.90          → execute_preapproved (only if pre-approved)
```
Source: `pitch.md` § "interruption scoring."

---

## Scaffold state — Nick's review of `codex/create-initial-baseline-branch-and-pr` (2026-04-26)

| File | What's there | Status |
|---|---|---|
| `package.json`, `tsconfig.json` | Node 22, TS strict, `node --test`, no extra deps | ✅ solid, ship-able |
| `src/context/types.ts` | Minimal `ContextEvent` (see above) | 🟡 placeholder — AIR-010 expands it |
| `src/context/ingest.ts` | UUID assignment + passthrough | ✅ trivial, fine |
| `src/memory/store.ts` | In-memory `MemoryRecord[]` (id, eventId, summary, createdAt) | 🟡 no retention, no decay, no confidence/sensitivity tagging — Flow 2 needs governance |
| `src/salience/engine.ts` | Placeholder linear formulas (e.g. `urgency = 1 - minutes_to_departure/60`) | ❌ does NOT match `pitch.md` formula — AIR-024 |
| `src/policy/engine.ts` | If-ladder over thresholds, returns 1 of 5 decisions | 🟡 logic reasonable but **no cooldown / interruption budget** — AIR-025 (trust-critical per pitch §6) |
| `src/api/orchestrator.ts` | Glues ingest → salience → policy → memory; tracks events/decisions | ✅ clean — Flows 2 & 3 will plug in here |
| `src/api/server.ts` | `node:http`: `POST /events`, `GET /state`, `POST /demo/leaving-mode` | ✅ minimal but fine for hackathon (no CORS, no validation, no auth — acceptable) |
| `src/demo/leaving_mode.ts` | 2 seed events for Flow 1 | ✅ pattern to copy for Flows 2 & 3 (AIR-022, AIR-023) |
| `tests/{api,policy,salience}.test.ts` | Unit tests for each engine | ✅ solid coverage for current scope |

**Verdict:** Merge-ready. Refinements (real salience formula, cooldown, memory governance, Flows 2 & 3) become follow-up tasks rather than merge blockers.

### Missing vs `pitch.md` (centralized — drives AIR-010 through AIR-025)

What's NOT in the baseline that the pitch promises. Each item maps to a queued Priority Forge task.

| Pitch concept | Status in baseline | Tracked as |
|---|---|---|
| Weighted salience formula (`0.35*urgency + 0.25*conf + 0.20*value + 0.10*reversibility - 0.25*annoyance - 0.30*privacy`) | ❌ not implemented — current code uses ad-hoc linear math | **AIR-024** |
| `reversibility` factor in `SalienceScore` | ❌ field absent | **AIR-024** (extend `SalienceScore` type) |
| Threshold gating at `0.30/0.50/0.70/0.90` | ❌ — current `PolicyEngine` uses different cutoffs (0.65 urgency, 0.7 user_value, etc.) | **AIR-024** |
| Cooldown / interruption budget (max one suggest/ask per N min) | ❌ not implemented — every event fires unconditionally | **AIR-025** (trust-critical per pitch §6) |
| Memory governance (confidence, sensitivity, allowed_actions, expires_or_revalidates) | ❌ — `MemoryRecord` is `{id, eventId, summary, createdAt}` only | **AIR-010** (schema) → Sebastian extends `src/memory/store.ts` |
| Flow 2 — Memory Capture (silent capture of casual mentions, resurface) | ❌ no demo, no resurfacing logic | **AIR-020** spec → **AIR-022** impl |
| Flow 3 — Consentful Action ("Text Alex you're 5 min late?" → tap-to-confirm) | ❌ `ask_permission` returns from policy but no UI / consent shape / allowlist | **AIR-021** spec → **AIR-023** impl |
| Glasses cue copy (length, voice, tone) | ❌ no cue strings anywhere — orchestrator stores generic `"${kind} from ${source}"` summary | **AIR-013** |
| Audit log / "why did this cue appear" explainability | ❌ — decisions are stored but not annotated with reason | not yet tracked — propose adding to AIR-014 (privacy model) since it's privacy-relevant |
| Privacy posture (data minimization, retention windows, opt-in/revoke) | 🟡 — `privacy_risk` score exists but no retention or revoke mechanism | **AIR-014** |

**Implication for ownership of AIR-024 / AIR-025:** these are refactors of code Sebastian just wrote. Default plan per HANDOFF role split: Nick writes the spec (AIR-011 = decision table + cooldown rules), then hands implementation to Sebastian via this doc. Sebastian's tooling is faster at touching code he just wrote than Claude is at coming in cold.

— *Review formalized 2026-04-26 by Nick (Claude). AIR-003 complete.*

---

## Open blockers

### Nick → Sebastian (Sebastian, please pick these up when ready)

**The spec round is complete.** All five spec docs Codex needs for the engine refinements and Flows 2 & 3 are now on `main`:

| Doc | Drives |
|---|---|
| `docs/context-schema.md` | Schema expansion: `MemoryRecord` governance fields, `SalienceScore.reversibility`, `PolicyDecision` becomes structured object, new `UserPermission` types. Reason codes in § 7. |
| `docs/policy-rules.md` | The full pipeline (six gates), the formula, the threshold table, cooldown/budget rules. Direct source for **AIR-024** + **AIR-025**. |
| `docs/glasses-cue-copy.md` | Every HUD string. Canon — copy verbatim, do not paraphrase. |
| `docs/flow-memory-capture.md` | Source for **AIR-022**. Includes `MemoryStore.findResurfaceCandidates` + orchestrator changes. |
| `docs/flow-consentful-action.md` | Source for **AIR-023**. Includes the action-template allowlist (§ 3) + Preapproval shape. |

**Recommended order on Sebastian's side, after merging PR #3:**

1. **AIR-024** (refine `SalienceEngine` per `policy-rules.md` § 2 + add `reversibility`). Smallest blast radius. Update `tests/salience.test.ts` with table-driven cases.
2. **AIR-025** (cooldown gate per `policy-rules.md` § 6). Touches `src/policy/engine.ts` and adds state. Update `tests/policy.test.ts`.
3. **AIR-022** (Flow 2 — memory capture + resurface). Net-new code: `src/demo/memory_capture.ts`, extensions to `src/memory/store.ts`, orchestrator change for synthetic-event recursion (cap depth at 1).
4. **AIR-023** (Flow 3 — consentful action). Net-new code: `src/demo/consentful_action.ts`, allowlisted action templates, `Preapproval` store stub.

Before starting any of these, **flag in this file under "In flight"** so Nick knows what to expect.

### Sebastian → Nick (Nick, please action these)

Housekeeping only — no implementation blockers:
- **Close PR #6 and PR #7** — docs-only blocker logs from the agent's workspace failure, not real progress.
- **Delete merged branches** — `nick/rename-code-to-air`, `codex/refine-salience-engine-and-add-tests` can both be cleaned up on GitHub.

What Sebastian could do as a human (not via Codex):
- Run `npm test` locally and confirm all 25 tests pass on Node 22.
- `npm start` + curl the demo endpoints (`/demo/leaving-mode`, `/demo/memory-capture`, `/demo/consentful-action`).
- Read the spec docs and challenge anything that feels wrong — especially `policy-rules.md` thresholds and `flow-consentful-action.md` action allowlist.
- Help with **AIR-051** (recording the 2-min walkthrough) — needs a screen recorder.
- Help with **AIR-042** (pitch deck) once Nick + Claude finish AIR-043 (pitch.md walkthrough).

### Open — code-level rename `SenseRoute` → `AIR`

**PR #4** (`nick/rename-code-to-air` → `codex/create-initial-baseline-branch-and-pr`) renames:
- `package.json` → `"name": "air"`, description
- `src/api/orchestrator.ts` → class `AIROrchestrator`
- `src/api/server.ts`, `src/index.ts` → import + log updates
- This branch's README + product-spec also renamed (separate from main's longer canonical versions)

**Merge order:** PR #4 first (rename → Sebastian's branch), then PR #3 (baseline + rename → main). On PR #3 merge, conflicts will appear on `README.md` and `docs/product-spec.md` — keep main's longer versions, discard the baseline branch's shorter ones.

Sebastian: do **not** force-push `codex/create-initial-baseline-branch-and-pr` — it'll wipe PR #4's commit.

---

## Recently merged (last 7 days)

- 2026-04-26 — `Initialize SenseRoute TypeScript baseline prototype` (commit `1039343`, **on baseline branch — not yet merged to main**) — Sebastian (Codex)
- 2026-04-26 — `docs: add SenseRoute product spec` (PR #2) — Sebastian (Codex)
- 2026-04-26 — `docs: rewrite README for 2-minute hackathon clarity` (PR #1) — Sebastian (Codex)
- 2026-04-26 — `Rename project from SenseRoute to AIR` (`3e57ecb`) — Nick
- 2026-04-26 — Doc rename `SenseRoute` → `AIR` in `README.md`, `docs/product-spec.md` + AGENTS.md HANDOFF pointer + this file (`HANDOFF.md`) — Nick (Claude)
- 2026-04-26 — PR #4 merged into baseline branch (rename in code) — Sebastian
- 2026-04-26 — Spec round: `context-schema.md`, `policy-rules.md`, `glasses-cue-copy.md`, `privacy-model.md`, `hackathon-tracks.md`, `flow-memory-capture.md`, `flow-consentful-action.md` — Nick (Claude). Closes AIR-010, 011, 013, 014, 020, 021, 040.
- 2026-04-26 — `docs: 2-min demo script (AIR-012) + README tighten (AIR-041)` — Nick (Claude). Closes AIR-012, AIR-041.
- 2026-04-26 — PR #5 merged: AIR-024 salience formula + reversibility + table-driven tests — Sebastian (Codex). Math verified.
- 2026-04-26 — Recovery commit: cherry-picked the abandoned baseline scaffold (`src/api/orchestrator.ts`, `server.ts`, `policy/engine.ts`, `memory/store.ts`, `actions/types.ts`, `context/ingest.ts`, `demo/leaving_mode.ts`, `index.ts`, `tests/api.test.ts`, `tests/policy.test.ts`) from closed PR #3 branch onto main with ESM imports + adapted to the new function-based salience API. All 9 tests pass on Node 22. — Nick (Claude)
- 2026-04-26 — `feat(policy): AIR-025 — six-gate pipeline with cooldown + threshold table` — Nick (Claude). Closes AIR-025. 17/17 tests pass.
- 2026-04-26 — `feat(memory): AIR-022 — Flow 2 memory capture + governance + resurface` — Nick (Claude). Closes AIR-022. 21/21 tests pass.
- 2026-04-26 — `feat(demo): AIR-023 — Flow 3 consentful action` — Nick (Claude). Closes AIR-023. 25/25 tests pass.

---

## Open questions

- Hackathon deadline / submission format — not captured anywhere yet. Add to README once known.

---

## Conventions for editing this file

- **Append, don't rewrite history.** If a section gets stale (e.g., "Recently merged" entries from >7 days ago), trim — don't delete the section.
- **Date and sign your entries.** Format: `2026-04-26 — short description — Nick (Claude)`.
- **Update the "Last updated" line at the top** when you make changes.
- **If you change an interface in "Agreed interfaces"**, also update the source file in the same PR — the doc is the contract.


### Completion notes

- 2026-04-26 — AIR-024 complete on `work`: `SalienceScore` now includes `reversibility`; composite salience now uses the exact weighted formula from `docs/policy-rules.md` §2 with [0,1] clamping; and `tests/salience.test.ts` now includes table-driven formula fixtures plus explicit reversibility coverage. — Sebastian (Codex)
- 2026-04-26 — Note: this checkout did not contain the previously-mentioned TypeScript scaffold from PR #3, so AIR-024 changes include creating the minimal `src/` + `tests/` files required to land salience engine work in this branch. — Sebastian (Codex)
