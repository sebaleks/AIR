# SenseRoute Product Spec

## 1) Product Thesis

SenseRoute is an **ambient-agent orchestrator for AI glasses**: a decision layer that determines *when* the system should act and *how much* attention to request.

The core hypothesis:
- Wearable AI only feels helpful when it is **timely, low-friction, and consent-aware**.
- Most moments should result in **no interruption**.
- The product value comes from choosing among: **ignore, remember, suggest, ask permission, or execute preapproved action**.

SenseRoute is not trying to be a “talkative assistant.” It is trying to be a **reliable attention router** that makes small, high-confidence interventions.

---

## 2) Target User

### Primary target (prototype)
- Knowledge workers and students who already use digital calendars and reminders.
- People who regularly transition between locations (home → class, office → meeting room, etc.).
- Users who are open to wearable cues but sensitive to interruptions.

### User characteristics
- Busy, context-switching schedule.
- Wants practical help (arriving prepared/on time) rather than novelty.
- Values privacy and explicit control over what the system does.

### Non-target for this hackathon
- Clinical/medical monitoring.
- Child users.
- Fully autonomous assistant behavior with broad app control.

---

## 3) Core Use Case: Leaving Mode

**Scenario:** User has class/work/meeting soon.

The system observes lightweight context (calendar, time-to-event, simple routine hints, and device state), then decides whether to:
- stay silent,
- store a memory for later,
- suggest an action,
- ask permission,
- or execute a preapproved action.

### Objective of Leaving Mode
Help the user leave on time and with essentials, while minimizing annoyance.

### Decision framing
Given an upcoming event and current context:
1. Is intervention necessary?
2. If yes, what is the minimum level of interruption?
3. Is explicit consent required?

### Output format
A short wearable cue (1 line + optional tap action), not a long conversation.

---

## 4) Demo Flow (Step by Step)

> This demo flow is designed for a hackathon prototype and intentionally constrained.

1. **Ingest event context**
   - Read next calendar event within a configurable horizon (e.g., next 90 minutes).
   - Parse event start time, title, and location string.

2. **Estimate urgency**
   - Compute time-to-event.
   - Apply simple threshold buckets (e.g., far, soon, urgent).

3. **Check routine/context hints**
   - Basic known prep needs (e.g., “weekly lab = bring badge”).
   - Device and session hints (e.g., currently in focus mode).

4. **Run policy decision**
   - Evaluate lightweight rules for ignore / remember / suggest / ask_permission / execute_preapproved.

5. **Generate wearable cue**
   - Create short message (e.g., “Meeting in 20m. Leave in ~8m to arrive on time.”).
   - Include one optional quick action if relevant.

6. **Capture user response (if any)**
   - Dismiss / confirm / accept suggestion.
   - Store response as feedback signal.

7. **Log outcome**
   - Record decision type and whether it was acted on.
   - Use logs for post-demo evaluation (precision of interventions, user acceptance).

---

## 5) System Decisions

SenseRoute produces exactly one primary decision per evaluation cycle.

### `ignore`
- **Meaning:** Do nothing and do not notify.
- **When used:** Low urgency, low confidence, user is busy, or predicted interruption cost is high.
- **Prototype implementation:** Rule-based threshold.

### `remember`
- **Meaning:** Store a contextual note for later retrieval without immediate interruption.
- **When used:** Potentially useful information that is not time-critical.
- **Prototype implementation:** Append to lightweight memory store with timestamp and event tag.

### `suggest`
- **Meaning:** Show a non-blocking suggestion.
- **When used:** Moderate confidence and clear utility.
- **Prototype implementation:** One-line cue with optional tap target.

### `ask_permission`
- **Meaning:** Ask user before taking a higher-impact action.
- **When used:** Action touches external systems or has social/attention cost.
- **Prototype implementation:** Minimal yes/no prompt in wearable UI.

### `execute_preapproved`
- **Meaning:** Perform a user-preapproved action automatically.
- **When used:** User has explicitly enabled specific automations in advance.
- **Prototype implementation:** Restricted to a narrow allowlist (e.g., draft a “running 5 min late” message template, or trigger a pre-set reminder).

---

## 6) Signals the Prototype Uses (Implemented Now)

The hackathon prototype should stay simple and auditable.

- Calendar event metadata:
  - start time
  - title
  - location text
- Current time and time-to-event
- Basic routine rules (static or user-provided)
- User-preapproved action list (small allowlist)
- Lightweight interaction feedback:
  - cue dismissed
  - cue accepted
  - permission granted/denied

### Explicitly out of scope in prototype
- Continuous audio recording.
- Always-on camera analysis.
- Passive collection of sensitive personal content.

---

## 7) Signals a Real Product Could Use Later (Aspirational)

These are not required for hackathon implementation, but inform roadmap direction.

- Real-time travel estimates (traffic/transit/walking ETA).
- On-device scene context (e.g., user appears to be in a conversation).
- Historical punctuality patterns per event type.
- Communication context (e.g., unread “where are you?” signals).
- Environmental constraints (weather, building access windows).
- Richer wearable state (battery, connectivity, attention confidence).

### Guardrail for future signals
Any new signal should be added only if it measurably improves intervention quality and passes privacy review.

---

## 8) Privacy Model

### Principles
1. **Data minimization:** collect only what is needed for routing decisions.
2. **Purpose limitation:** context used for immediate assistance, not broad profiling.
3. **User control:** explicit toggles for permissioned actions and data categories.
4. **Transparency:** user can inspect why a cue appeared.

### Prototype privacy posture (implemented now)
- Limited local/session storage for events, decisions, and feedback.
- No raw audio/video ingestion.
- No background third-party data sharing.
- Preapproved actions require explicit opt-in.

### Real product expectations (aspirational)
- Strong on-device processing by default.
- Fine-grained retention controls and deletion UX.
- Auditable decision logs visible to users.
- Differential privacy or aggregation for analytics where feasible.

---

## 9) Failure Modes

1. **Over-notification**
   - Too many cues reduce trust.
   - Mitigation: strict interruption budget, cooldown windows.

2. **Under-notification**
   - Missed helpful moments.
   - Mitigation: post-event feedback loop and threshold tuning.

3. **Bad timing**
   - Cue appears during sensitive social moment.
   - Mitigation: conservative defaults and context-aware suppression.

4. **Wrong action confidence**
   - System suggests or executes when uncertain.
   - Mitigation: confidence gating + fallback to ask_permission.

5. **Privacy discomfort**
   - User perceives creepiness.
   - Mitigation: clear data boundaries and explainability.

6. **Automation surprise**
   - User forgets what is preapproved.
   - Mitigation: visible automation list and easy revoke.

---

## 10) Hackathon Success Criteria

SenseRoute demo is successful if it shows:

1. **Reliable decisioning**
   - The five decision types are implemented and observable in logs/UI.

2. **Useful Leaving Mode behavior**
   - At least one realistic scenario where the cue helps user leave on time/prepared.

3. **Low-friction wearable UX**
   - Cues are concise and interrupt only when justified.

4. **Clear implemented vs aspirational boundaries**
   - Demo clearly labels current signals and future possibilities.

5. **Privacy-first framing**
   - Explicitly demonstrates consent for higher-impact actions.

### Suggested demo metrics
- Intervention acceptance rate.
- False-interruption count (user dismissed as unhelpful).
- Permission acceptance/denial split.
- On-time departure improvement in scripted scenarios.

---

## 11) Future Roadmap

### Phase 1: Post-hackathon hardening
- Improve policy calibration from feedback data.
- Add deterministic test cases for decision policy.
- Expand explainability in cue details (“why now”).

### Phase 2: Context enrichment
- Add travel ETA and dynamic schedule changes.
- Add richer routine learning with explicit user controls.
- Introduce per-context interruption preferences.

### Phase 3: Trust and ecosystem
- Deeper privacy controls and retention management.
- Safe integrations (messaging, task managers) behind permission boundaries.
- Personalization models focused on reducing unnecessary prompts.

### Long-term vision
SenseRoute becomes the **attention operating layer** for wearable AI: minimal, respectful, and dependable in high-context daily transitions.
