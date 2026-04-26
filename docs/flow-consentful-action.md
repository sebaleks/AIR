# Flow 3 — Consentful Action

The third demo flow. The user is about to be late; AIR offers to send a message; user taps yes; the message is sent; AIR confirms with a one-line statement. After this flow happens once, AIR offers to remember the consent so it can act faster next time — but the user must opt in to that.

This file is the source-of-truth for **AIR-023** (implementation). Sebastian: copy the strings, types, and pipeline below verbatim.

> Reads: `docs/context-schema.md`, `docs/policy-rules.md`, `docs/glasses-cue-copy.md`. Don't change behavior without updating those upstream first.

---

## 1. Scenario

**8:55 AM.** The user has a 9:00 AM 1:1 with Alex on calendar. Travel time is now 8 minutes from current location. They're not moving toward the destination.

AIR notices: this user will be late. There's a known recipient (Alex). There's a learned communication pattern ("when running late, the user texts the affected person"). There's no pre-existing preapproval for this template + recipient combination yet.

**Cue:** `"Running 5 min late. Text Alex?"`

User taps confirm. AIR drafts and sends a one-line message: "Running 5 min late." Then surfaces: `"Texted Alex."` and a one-time follow-up: `"Don't ask again for Alex?"`

If the user accepts the second prompt, a `Preapproval` is created with scope `{ recipients: ["alex@example.com"], contexts: ["calendar_running_late"], max_per_day: 3 }`. Subsequent late-arrival events for Alex will fire `execute_preapproved` directly with confirmation cue `"Texted Alex."` — no question, no friction.

If the user dismisses the second prompt, no preapproval is created and the next late-arrival cue will ask again.

---

## 2. Why this earns the "consent" framing

A typical agent demo would either:
- (a) ask permission every single time, which gets annoying and the user starts ignoring (eroding the engine's trustworthiness), or
- (b) silently text Alex on a routine match, which is creepy and breaks user agency.

AIR splits this into a **two-step graduated consent**: first time = ask, then offer to graduate to silent based on what *just happened*. The user experiences this as "the agent is learning what I want it to do" rather than "the agent decided on its own to start texting people."

The Preapproval is **scoped, time-limited, and revocable** (see `docs/privacy-model.md` § 5). Even after the user accepts, the next 6th text in a day gets re-prompted (the `max_per_day: 3` budget — adjustable). This is intentional: even *with* consent, automation should remain visible.

---

## 3. Action template allowlist

The set of `action_template` strings that can ever be preapproved. **Anything not on this list cannot be silently executed**, regardless of user setting.

| Template ID | What it does | Default scope keys |
|---|---|---|
| `send_message_running_late` | Send a one-line "running N min late" message to a specific recipient | `recipients`, `max_per_day` |
| `send_message_on_my_way` | Send "on my way" to a specific recipient | `recipients`, `max_per_day` |
| `set_reminder_for_event` | Create a reminder timed to an upcoming calendar event | `event_kinds`, `max_per_day` |
| `open_route_to_destination` | Navigate to a known destination on the user's phone | `destinations` |
| `enable_focus_mode` | Toggle Slack/system DND for a defined duration | `max_minutes`, `categories` |

Templates **not** on this list (and that should never be auto-executed):
- ❌ Sending arbitrary message bodies
- ❌ Anything that incurs a charge (Uber, purchases, ticket booking)
- ❌ Posting publicly (social media, public Slack channels)
- ❌ Modifying calendar events for other people
- ❌ Anything irreversible

Adding a new template is a deliberate code change + privacy review — flag it in HANDOFF.md before submitting the PR.

---

## 4. Pipeline

Follows `docs/policy-rules.md` § 1, with the relevant gates highlighted:

```
ContextEvent { kind: "calendar_event_upcoming", payload: { event, minutes_to_event: -5, attendees } }
  ↓
SalienceEngine → composite ≈ 0.745  (high urgency + high confidence + low reversibility)
  ↓
Threshold gate → proposed action: ask_permission   (0.70 ≤ 0.745 < 0.90)
  ↓
Privacy override → privacy_risk = 0.30, no override
  ↓
Memory governance → no resurfaced memory drove this; pass-through
  ↓
Cooldown gate → no recent interrupts; pass-through
  ↓
Permission lookup → no Preapproval matches yet; stays ask_permission
  ↓
PolicyDecision { action: "ask_permission", cue: "Running 5 min late. Text Alex?", reason: "policy_consent_required" }
```

After the user taps yes:
1. `executePreapproved(template_id="send_message_running_late", parameters={...})` runs the message-send.
2. A second `PolicyDecision` is logged with `action: "execute_preapproved"`, cue `"Texted Alex."`.
3. A third *follow-up* prompt is fired: `"Don't ask again for Alex?"` (template `ask.preapproval_grant`). This is in-band UI, not a separate event.
4. If user accepts → create `Preapproval` (see § 5). If dismisses → no preapproval; behavior unchanged for next time.

If a `Preapproval` matched at step 6 of the pipeline, the flow short-circuits: the cue would have been `"Texted Alex."` directly with no ask, and the post-action follow-up would be skipped.

---

## 5. Preapproval shape (when granted inline)

After the user accepts "Don't ask again for Alex?":

```ts
const preapproval: Preapproval = {
  id: "pre_01",
  action_template: "send_message_running_late",
  scope: {
    recipients: ["alex@example.com"],   // resolved from event.payload.attendees
    contexts: ["calendar_running_late"],
    max_per_day: 3,
  },
  granted_at: "2026-04-26T16:55:30Z",
  expires_at: "2026-07-25T16:55:30Z",   // 90-day default; revisit per docs/privacy-model.md
};
```

All scope fields are **inferred from the current event**, not free-form. The user is approving a specific narrow case, not a wildcard. If they want broader scope ("text any colleague when I'm late"), that requires going to Settings → Preapprovals → Edit.

---

## 6. Confirm UI shape

The cue is shown on the HUD. The user can confirm three ways:

| Modality | Yes signal | No signal |
|---|---|---|
| Tap | Single tap on G2 temple | Double tap or no tap before timeout |
| Voice | "Yes" / "Send it" / "Go ahead" | "No" / "Cancel" / "Not now" |
| Implicit | (none — must be explicit) | Cue expires after 4 seconds with no response → treated as no |

**Timeout = silent dismiss.** If the user doesn't respond within 4 seconds, the cue clears, the action does **not** execute, and no preapproval prompt fires. Reason code logged: `user_response: "ignored_timeout"`.

This is a hard rule. An agent that proceeds on no-response is not consentful — it's hopeful.

---

## 7. Failure modes

| Failure | Mitigation |
|---|---|
| User taps yes by mistake | Action is "draft message"; actual send is delayed 3 seconds with a `"Sending in 3..."` cue. Tap again to cancel. (Stretch — for hackathon prototype, immediate send is fine; flag in HANDOFF.) |
| Preapproval is too broad | Default scopes are narrow (one recipient, one context, low daily cap). User must edit settings to widen. |
| Preapproval grants for a malicious context | Templates are allowlisted (§ 3); no path exists to grant approval for an off-allowlist action. |
| User wants to revoke after accepting | One-tap revoke from audit log entry (per `docs/privacy-model.md` § 5). |
| Network failure during send | Cue updates to `"Couldn't send. Retry?"` (template `error.retry_send`). Don't silently retry — that's another consent break. |

---

## 8. Implementation handoff (for Sebastian, AIR-023)

`src/demo/consentful_action.ts` (new — copy `src/demo/leaving_mode.ts` as the pattern). What it does:

1. Seeds an event matching the scenario in § 1.
2. Calls `orchestrator.ingestEvent(event)` and asserts the resulting `PolicyDecision.action === "ask_permission"`.
3. Simulates the user response (parameter to the demo function: `userResponse: "yes" | "no" | "timeout"`).
4. On `yes`: simulates the executed action and logs the second decision; fires the preapproval-grant prompt.
5. Returns the full sequence of decisions for the demo runner to display.

API endpoint: add `POST /demo/consentful-action` to `src/api/server.ts` mirroring `/demo/leaving-mode`.

Tests: `tests/flow-consentful-action.test.ts` covering all three response paths plus the case where a preapproval already exists.

**Cue strings are canon — do not paraphrase:**
- `"Running 5 min late. Text Alex?"`
- `"Texted Alex."`
- `"Don't ask again for Alex?"`
- `"Couldn't send. Retry?"`

Flag in HANDOFF.md when starting; tag the relevant `MemoryRecord`/`Preapproval` types in the same PR.
