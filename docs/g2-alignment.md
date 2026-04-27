# G2 SDK alignment audit

How AIR maps onto the Even Realities G2 SDK as documented at <https://hub.evenrealities.com/docs/getting-started/overview>.

Owner: Nick. Living doc — re-run the audit after every SDK doc update or major spec change. Mark each row ✅ aligned, 🟡 partial / needs adapter, ❌ missing or contradicted.

---

## TL;DR

Our system is **architecturally compatible** with G2 — the four product pillars (salience scoring, interruption budget, memory governance, permissioned action ladder) all land on capabilities the SDK exposes. The gaps are at the I/O boundary, not in the policy core:

1. **Voice transcription is on us.** SDK delivers raw 16 kHz PCM; no built-in STT. `voice_mention` events currently assume a `transcript` string already exists.
2. **Single event-capture container per page.** SDK routes all input to one designated container; our HUD cards must be a single text container with a tap state machine, not separate yes/no buttons.
3. **Memory retention is app-side.** SDK gives us key/value `setLocalStorage`/`getLocalStorage` only — no per-record TTL or category controls. We manage retention in app code.
4. **Permission flow is undocumented.** No `requestPermission` API is mentioned — defer until we hit it on hardware.

The refactor (separate task in this PR) introduces an `EventSourceAdapter` interface so calendar / location / audio / motion / non-G2 ingestors plug in without touching the salience / policy / memory layers. Same pattern for output: a `CueRenderer` interface so the existing CLI runner, a future `EvenG2CueRenderer`, and test mocks can swap.

---

## Hardware constraints

| Constraint (per docs) | Our system today | Status |
|---|---|---|
| 576×288 per eye, 4-bit greyscale | Cue copy ≤40 chars target, ≤60 hard max (`docs/glasses-cue-copy.md`). Well inside the 2,000-char `textContainerUpgrade` ceiling. | ✅ |
| No camera | Pitch and demo flows already lean on the fact that G2 is mic + HUD only. No code references vision. | ✅ |
| No speaker | We never emit audio — only HUD text. | ✅ |
| 4-mic array, 16 kHz PCM mono | Audio ingestion designed around `voice_mention` events, but `payload.transcript` assumes STT already happened. | 🟡 |
| Touch on temples (press / double / swipe ↑ / swipe ↓) | Our consent flow assumes "tap yes" / "tap no" / "timeout = no" — maps cleanly to `CLICK_EVENT` / `DOUBLE_CLICK_EVENT`. | ✅ |
| IMU available, no head/gaze tracking | We don't currently use IMU; could optionally use it to derate `annoyance_cost` when user appears to be in motion / conversation. Out of scope for v0. | 🟡 |

---

## Display & UI

| API / capability | Our usage | Status | Notes |
|---|---|---|---|
| `createStartUpPageContainer` | Initial HUD card creation | ✅ | We can build this in once `EvenG2CueRenderer` lands. |
| `textContainerUpgrade(containerID, containerName, newContent, contentOffset, contentLength)` | Low-flicker update for cue text | ✅ | Spec calls it out as the right primitive for our use. |
| `rebuildPageContainer` | Switching cue states (e.g., `"Running 5 min late. Text Alex?"` → `"Texted Alex."`) | 🟡 | Either rebuild or keep one text container and `textContainerUpgrade` it. We prefer the latter to avoid flicker. |
| 8 non-image + 4 image containers per page | Cue + (optional) "Why this cue?" overlay + audit log button | ✅ | Plenty of headroom. |
| `isEventCapture: 1` — exactly one container handles all input on a page | A cue's tap-target | 🟡 | **Constraint:** cannot have separate yes / no containers each receiving events. The full cue (question + implicit affordances) is one container. Yes/no resolved via `CLICK_EVENT` (yes) vs `DOUBLE_CLICK_EVENT` (no) — to be confirmed on hardware. |
| List containers (max 20 items, 64 chars each) | Audit log / "history view" from `docs/privacy-model.md` § 4 | ✅ | Maps cleanly. |
| 4-bit greyscale (`borderColor: 0..15`) | No color reliance in our copy | ✅ | We don't depend on color. |
| No animation / transitions | Our HUD cards are text only with no motion | ✅ | |
| No built-in "yes/no" primitive | Consentful Action UI | 🟡 | Build with one text container + tap-state machine per `docs/flow-consentful-action.md` § 6 (yes = `CLICK_EVENT`, no = `DOUBLE_CLICK_EVENT`, timeout = no response). |

---

## Input events

Documented event types: `CLICK_EVENT`, `SCROLL_TOP_EVENT`, `SCROLL_BOTTOM_EVENT`, `DOUBLE_CLICK_EVENT`, `FOREGROUND_ENTER_EVENT`, `FOREGROUND_EXIT_EVENT`, `ABNORMAL_EXIT_EVENT`. Subscribed via `bridge.onEvenHubEvent(event => …)`.

| Our flow | SDK mapping | Status |
|---|---|---|
| User taps "yes" on `ask_permission` cue | `CLICK_EVENT` on the event-capture container | ✅ |
| User taps "no" / dismisses | `DOUBLE_CLICK_EVENT` (or timeout) | 🟡 — verify on hardware which gesture is intuitive for "no" |
| Cue timeout = silent dismiss | App-side timer; no SDK-level timeout primitive | 🟡 — implement in CueRenderer |
| User opens "Why this cue?" tap-to-expand | `SCROLL_TOP_EVENT` or a second tap state | 🟡 — design pending |
| App entered foreground / backgrounded | `FOREGROUND_ENTER_EVENT` / `FOREGROUND_EXIT_EVENT` | ✅ — useful for cooldown semantics (consider not counting cooldown time while user is foregrounded into another app) |
| Voice events as separate event type | None documented — voice is raw PCM via `audioControl`, not events | ❌ — STT layer needed |

---

## Audio

`bridge.audioControl(true)` opens the 4-mic array → callback receives `audioEvent` with 16 kHz PCM signed 16-bit LE mono frames.

| Our flow | SDK mapping | Status |
|---|---|---|
| Capture a `voice_mention` with `intent: "self_reminder"` | Raw audio frames; **STT happens app-side or via cloud** | 🟡 — `voice_mention.payload.transcript` requires upstream transcription |
| Wake-word / always-on listening | App-side; SDK gives raw frames continuously while `audioControl(true)` | 🟡 — battery + privacy implications; `docs/privacy-model.md` § 2 already says voice is "ephemeral STT, drop audio after transcription" — implementation must enforce |

**Implication:** an `EvenG2AudioAdapter` wraps `audioControl` + an STT step (cloud Whisper, Deepgram, or on-device) and emits normalized `ContextEvent { kind: "voice_mention", payload: { transcript, intent } }`. The orchestrator stays unchanged.

---

## IMU / motion

`bridge.imuControl(isOpen, reportFrq?)` subscribes to `IMU_DATA_REPORT` events with `{ x, y, z }` floats at one of `P100..P1000`.

We don't currently use IMU. Optional future use:
- **`annoyance_cost` modifier**: high motion (walking, head turns) → user is in transit, cues are less intrusive. Low motion + steady orientation → user is sitting / talking, increase `annoyance_cost`.
- **"User is in conversation" signal** (would be valuable for the Agents-for-Good narrative). Not feasible from IMU alone, but combined with audio amplitude could approximate.

**Status: 🟡** — design opportunity, not a v0 requirement.

---

## Storage

`bridge.setLocalStorage(key, value)` / `bridge.getLocalStorage(key)`. Both async-wrapped. No documented size limit, no per-record TTL, no category-scoped retention.

| Our promise (`docs/privacy-model.md`) | SDK reality | Status |
|---|---|---|
| Per-record `expires_or_revalidates` enforced | App-side: scan store on startup, drop expired records | 🟡 — implement in `MemoryStore.persist()` / `restore()` |
| Per-category retention windows (calendar 30d, voice transcripts 0s, etc.) | App-side: prefix keys by category, scan-and-purge per window | 🟡 — same |
| One-tap "revoke all preapprovals" | App-side: enumerate `preapproval/*` keys and delete | 🟡 — same |
| Audit log persistence | App-side: append-only log under `audit/*` keys | 🟡 — same |
| Encrypted at rest | Not documented; assume not | ❌ — hackathon scope cut, document as v1 work |

**Implication:** the in-memory `MemoryStore` becomes a persistence-aware store backed by `bridge.setLocalStorage`. The governance layer (TTLs, categories, audit log) lives in app code regardless of SDK.

---

## Network / permissions

| Capability | Status | Notes |
|---|---|---|
| Outbound network for LLM / STT calls | Documented at the architecture level ("Network permission for backend/LLM calls") but **no specific API surface in the device-apis page** | 🟡 — assume standard browser `fetch` works inside the WebView |
| Location permission | Mentioned ("Location permission if we use phone location triggers") but no API shape | 🟡 — likely standard `navigator.geolocation` |
| Permission request UI flow | **Not documented** | ❌ — defer until hardware testing |

---

## EvenAppBridge / lifecycle

`bridge = await waitForEvenAppBridge()` from `@evenrealities/even_hub_sdk` (npm). Documented methods we'd use:

- `audioControl(boolean)` — start/stop mic
- `imuControl(boolean, reportFrq?)` — start/stop IMU
- `getDeviceInfo()` — model, battery, wearing, charging
- `getUserInfo()` — uid, name, country
- `setLocalStorage(key, value)` / `getLocalStorage(key)` — KV storage
- `onEvenHubEvent(callback)` — input + IMU + audio subscription
- `onDeviceStatusChanged(callback)` — battery / wearing changes
- `textContainerUpgrade(...)` — flicker-free text update
- `createStartUpPageContainer(...)` — initial HUD page
- `rebuildPageContainer(...)` — full page swap

---

## Plugin / build target

| Constraint | Our setup |
|---|---|
| TypeScript / Vite web plugin | ✅ — current code is TS + ESM, easy port to Vite. Today we run via Node 22 `--experimental-strip-types` for tests. |
| `app.json` manifest | ❌ — not yet created. Add when we wire the SDK. |
| Simulator: `evenhub-simulator http://localhost:5173` | 🟡 — Vite dev server isn't set up yet; current `npm start` runs the Node HTTP server for the orchestrator API. Two-process setup: orchestrator backend + Vite-served WebView frontend. |

---

## Spec docs to update for G2 reality

Inline diffs (or follow-up tasks):

- **`docs/glasses-cue-copy.md`**: add a §9 "G2 hardware notes" — single event-capture container; yes/no maps to `CLICK_EVENT`/`DOUBLE_CLICK_EVENT`; `textContainerUpgrade` is the update primitive.
- **`docs/flow-consentful-action.md` § 6 (Confirm UI shape)**: clarify that "tap" means `CLICK_EVENT`, "no" means `DOUBLE_CLICK_EVENT` or 4-second timeout — to be calibrated on hardware.
- **`docs/privacy-model.md` § 2**: voice ingestion bullet should say "raw 16 kHz PCM via `audioControl`; STT happens in `EvenG2AudioAdapter`; raw audio dropped after transcription."
- **`docs/privacy-model.md` § 3**: add note that retention windows are enforced app-side on top of `setLocalStorage` (no native TTL).
- **`docs/demo-script.md` Scene 3** ("Why this cue?" overlay): clarify this is a second container on the same page (not a separate page); it appears when user `SCROLL_TOP_EVENT`s while the cue is up.
- **`docs/context-schema.md` § 1**: `voice_mention.payload.transcript` should be marked `transcript: string  // populated by EvenG2AudioAdapter; raw audio not exposed to engine`.

These are doc-only deltas — none change the policy / salience / memory engines.

---

## Adapter architecture (this PR)

Two interfaces land alongside this audit:

### `EventSourceAdapter`

Plugs any external signal source into the orchestrator without the engine knowing where events came from. Lives in `src/adapters/types.ts`. Each adapter:
- Normalizes its native shape (calendar API, geolocation, EvenAppBridge events, mock test fixtures) into `ContextEvent`.
- Owns its own connection lifecycle (`start()` / `stop()`).
- Pushes events to a callback the orchestrator owns.

Initial implementations:
- `EvenG2BridgeAdapter` — stub showing how `audioControl` + `imuControl` + `onEvenHubEvent` map to `ContextEvent` (no SDK install required to compile).
- `MockCalendarAdapter` — drives the seeded demo events (replaces the inline calls in `runLeavingModeDemo` etc. with the same pattern any external calendar would use).

### `CueRenderer`

The other end of the same pattern: the policy decision lands as a `RenderedCue`, and the renderer (CLI / EvenG2 HUD / test mock) decides how to surface it.

Initial implementations:
- `CliCueRenderer` — what `src/demo/cli.ts` already does (consolidated behind the interface).
- `EvenG2CueRenderer` — stub mapping each `PolicyAction` to the right `textContainerUpgrade` invocation.
- `MockCueRenderer` — captures rendered cues for tests.

The orchestrator gains `registerAdapter(...)` and `setRenderer(...)`. `MockCalendarAdapter` + `MockCueRenderer` is what the test suite and `npm run demo` actually use; swapping in `EvenG2BridgeAdapter` + `EvenG2CueRenderer` is what the production build does.

---

## Open questions for hardware / further docs

1. Confirm `DOUBLE_CLICK_EVENT` is the right "no / dismiss" gesture — vs swipe-down.
2. Confirm whether multiple non-event-capture containers can be tap-targets for tap-to-expand affordances, or if we truly get one tap target per page.
3. Confirm `audioControl` battery profile under always-on listening — may force us to a wake-word strategy.
4. Permission request UX: is it phone-side, glasses-side, or both? Determines how `docs/privacy-model.md` § 5 ("opt-in / revoke") gets implemented.
5. Page lifecycle interaction with cooldown: should `FOREGROUND_EXIT_EVENT` pause the cooldown clock?

These are validation items for hardware testing — not blockers for the demo recording.
