# HANDOFF — AIR coordination log

> **For agentic tools (Codex, Claude, etc.):** read this file at the start of every session. It tells you what's in flight, what interfaces have been agreed on, and what's blocking each side. **Update it whenever you finish a chunk of work, hit a blocker, or change a shared interface.** Append to the relevant section; keep entries dated and signed (`— Nick (Claude)` or `— Sebastian (Codex)`).
>
> Rule of thumb: if your change would surprise the other agent's next session, it belongs here.

Last updated: **2026-04-26** by Nick (Claude).

---

## Role split

| Side | Tooling | Owns |
|---|---|---|
| **Nick** | Claude (Opus 4.7) | Spec docs, narrative, demo script, pitch deck, adversarial review |
| **Sebastian** | Codex Cloud | Scaffolding, src/ implementation, tests, persistence, infra |

This split is **flexible** — if Sebastian's throughput slows or Nick wants deeper code ownership, we revisit. Current default per `works-split.md`: Claude shapes "what should this agent do and why," Codex shapes "make the repo actually work." Spec docs Nick writes are intended to be fed directly into Codex prompts as source-of-truth.

Task queue (Nick's side) lives in Priority Forge under project `AIR`. Sebastian's side has no equivalent tracker yet — when he picks up a task from this doc, mark it `[in flight — Sebastian]`.

---

## Active branches / PRs

| Branch | Owner | Status | Notes |
|---|---|---|---|
| `main` | shared | baseline | Has README, AGENTS.md, `docs/product-spec.md`. No `src/` yet. |
| `codex/create-initial-baseline-branch-and-pr` | Sebastian | **OPEN, not yet merged** | TypeScript scaffold: `src/{context,memory,salience,policy,actions,api,demo}` + `tests/` + `package.json`/`tsconfig.json`. ~640 LOC. Functional skeleton with placeholder logic. Nick has reviewed (see Scaffold state below). Recommend: merge as-is, treat refinements as follow-up tasks. |
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

---

## Open blockers

### Nick → Sebastian (Sebastian, please pick these up when ready)

- **None yet.** When AIR-010 (`docs/context-schema.md`) lands, Sebastian can extend `src/context/types.ts` to match. Same for AIR-011 → `src/policy/engine.ts` cooldown/formula refinement (AIR-024, AIR-025).

### Sebastian → Nick (Nick, please action these)

- **Confirm merge of baseline PR** so Nick can begin Flow 2 / Flow 3 implementation tasks (AIR-022, AIR-023).

### In flight — code-level rename `SenseRoute` → `AIR`

Nick (Claude) is preparing a stacked branch off `codex/create-initial-baseline-branch-and-pr` named `nick/rename-code-to-air` that renames:
- `package.json` → `"name": "air"`, description, etc.
- `src/api/orchestrator.ts` → class `AIROrchestrator`
- `src/api/server.ts`, `src/index.ts`, `tests/api.test.ts` → import updates

Sebastian: please pull this branch into your baseline PR (or accept the stacked PR) before merging baseline to `main`. Do **not** force-push your baseline branch in the meantime — it'll wipe the rename commit.

---

## Recently merged (last 7 days)

- 2026-04-26 — `Initialize SenseRoute TypeScript baseline prototype` (commit `1039343`, **on baseline branch — not yet merged to main**) — Sebastian (Codex)
- 2026-04-26 — `docs: add SenseRoute product spec` (PR #2) — Sebastian (Codex)
- 2026-04-26 — `docs: rewrite README for 2-minute hackathon clarity` (PR #1) — Sebastian (Codex)
- 2026-04-26 — `Rename project from SenseRoute to AIR` (`3e57ecb`) — Nick
- 2026-04-26 — Doc rename `SenseRoute` → `AIR` in `README.md`, `docs/product-spec.md` + AGENTS.md HANDOFF pointer + this file (`HANDOFF.md`) — Nick (Claude)

---

## Open questions

- Hackathon deadline / submission format — not captured anywhere yet. Add to README once known.

---

## Conventions for editing this file

- **Append, don't rewrite history.** If a section gets stale (e.g., "Recently merged" entries from >7 days ago), trim — don't delete the section.
- **Date and sign your entries.** Format: `2026-04-26 — short description — Nick (Claude)`.
- **Update the "Last updated" line at the top** when you make changes.
- **If you change an interface in "Agreed interfaces"**, also update the source file in the same PR — the doc is the contract.
