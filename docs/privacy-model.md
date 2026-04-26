# Privacy model

How AIR handles user data — what we collect, what we keep, who can see why a cue appeared, and how to revoke. This is the "anti-creepy" promise that backs the marketing line *"wearable AI must be polite."*

Owner: Nick. Expands `docs/product-spec.md` § 8 into the per-feature contracts the demo (and any future product) must honor.

---

## 1. Principles

1. **Data minimization** — collect only what is needed to make the next routing decision. No "we'll figure out what to do with it later" data.
2. **Purpose limitation** — context used for *immediate assistance*, never for behavioral profiling, advertising, or third-party share.
3. **User control** — every category of data is opt-in and revocable from a single screen. Default state is *off*.
4. **Transparency** — the user can ask "why this cue?" for any HUD output and get a structured explanation back.
5. **No surveillance aesthetic** — no continuous audio/video, no "the agent is always watching" framing. Always-on is *signal-listening*, not *recording*.

These are commitments, not aspirations. If a feature in `src/` violates one, it's a bug.

---

## 2. Data categories and posture

| Category | Hackathon prototype | Real-product target |
|---|---|---|
| Calendar metadata (event title, time, attendees) | Read on-demand from local mock | OAuth-scoped, on-device cache, opt-in per calendar |
| Location | Geofence boundaries only (e.g., "home"/"office") — no raw lat/long | On-device only, never uploaded |
| Voice mentions | One-shot transcription of explicit utterances (e.g., "remember to…") — no continuous capture | On-device wake-word + ephemeral STT, drop audio after transcription |
| Messaging context | Read recipient name + message metadata, not message body | Scoped per app, body access requires per-event consent |
| Biometric (heart rate, etc.) | **Not collected** | Scoped opt-in, never used for routing without explicit category enable |
| Camera / image | **Not collected** (G2 has no camera; pitch positioning is mic-first) | N/A for G2 platform |

**Hard line for the hackathon demo:** all data is in-memory only. Restart wipes everything. No persistence, no upload.

---

## 3. Retention

For the hackathon prototype, retention is **session-bounded** (process restart = forget). For a real product, the per-category retention table:

| Category | Default retention | Notes |
|---|---|---|
| `ContextEvent` (raw) | 24 hours | Used for short-term salience context, then drop. |
| `PolicyDecision` (audit log) | 30 days | User-readable; basis for "why this cue?" |
| `MemoryRecord` (low/medium sensitivity) | Until `expires_or_revalidates` (default 30 days) | See `docs/context-schema.md` § 2 |
| `MemoryRecord` (high/critical) | 7 days max, with re-prompt | High-sensitivity memories must be reaffirmed weekly or they drop. |
| `Preapproval` | Until `expires_at` or revoked | Revoke is one-tap. |
| Voice transcription bytes | **0 seconds** — never stored | Transcript text is stored as a `voice_mention` event; raw audio is dropped immediately. |

Every record carries an explicit `expires_or_revalidates` field — there is no "default forever."

---

## 4. Audit log — "why this cue?"

Every `PolicyDecision` is appended to a per-user audit log and made queryable from the user's settings. Schema:

```ts
type AuditEntry = {
  decisionId: string;
  decidedAt: string;
  cue?: string;                    // what the user saw, if anything
  reason: string;                  // structured code, see context-schema.md § 7
  inputs: {
    event_kind: string;
    event_source: string;
    salience_total: number;
    salience_components: SalienceScore;
    cooldown_active: boolean;
    consulted_memory_ids?: string[];
    consulted_preapproval_id?: string;
  };
  user_response?: "accepted" | "dismissed" | "ignored_timeout";
};
```

Two interfaces over this:
- **Per-cue tap-to-explain**: tapping any cue brings up "Why this cue?" with the human-readable summary of `inputs`.
- **History view**: all entries for the past 30 days, filterable by reason code.

The audit log is **read-only to AIR itself** — it can't gate decisions on past decisions (that's what `cooldown_state` is for). It exists for the user, not the engine.

---

## 5. Opt-in and revoke UX

### Initial state
On first use, all categories in § 2 are **off**. The user must explicitly enable each one. There's no "enable all" button — that's a dark pattern.

### Per-category screen
Each category has its own toggle with three settings:
1. **Off** — never collected. Engine treats all events from this category as nonexistent.
2. **On — for this session** — collected, used, dropped on app close.
3. **On — persistent** — collected per the retention rules in § 3.

### Preapprovals
Created two ways:
1. **Inline grant**: after answering "yes" to an `ask_permission` cue, the user is asked once: "Don't ask again for this kind of action?" One-tap creates a `Preapproval` with reasonable scope defaults.
2. **Settings → Preapprovals**: full CRUD interface. Each preapproval shows last-used time and total uses.

### Revoke
- One tap from the audit log entry: "Revoke the preapproval that allowed this." Sets `revoked_at = now`.
- Bulk: "Revoke all preapprovals" is always available, no confirmation gymnastics.
- Categories: turning a category off auto-revokes preapprovals that depended on it.

### Blanket denial
The user can mark any `action_kind` as never-allowed (`BlanketDenial`). This wins over any future preapproval grant — the engine will refuse to create a preapproval for a denied kind without a re-prompt.

---

## 6. What the demo must show

To prove the privacy posture isn't just words, the 2-min demo (per `docs/demo-script.md` when written) should include:

1. **One "why this cue?" tap** on a `suggest` cue, showing the structured reason.
2. **One inline preapproval grant** after an `ask_permission` accept ("Don't ask again? Yes — for Alex only, max 3/day").
3. **One privacy override** — show that a high-`privacy_risk` event still asks even though the score would have executed.

If we can hit those three beats in 30 seconds total, the privacy story sells itself.

---

## 7. What's *not* in the privacy model (yet)

Out of scope for the hackathon prototype, intentionally:

- Encrypted-at-rest storage (in-memory only).
- On-device LLM inference (would use cloud APIs in v0; categories that route through cloud are flagged in audit log).
- Differential privacy on aggregate metrics (no metrics collected).
- GDPR/CCPA workflow tooling (data subject requests etc.).
- Multi-tenant access controls (single user assumed).

Each of these is a real product concern; flag in HANDOFF.md if any becomes load-bearing for a particular demo beat.
