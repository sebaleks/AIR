# How AIR maps to the hackathon tracks

Each track gets one paragraph: the specific demo moment that hits it, and why this is different from the typical entry in that track.

---

## Ambient Agents

AIR's first demo flow — Leaving Mode — fires *before the user asks for anything*. At 8:24am the system has watched a calendar event drift toward "leave time" and a routine pattern indicate the user usually packs a charger. It surfaces one cue: `"Leave in 6 min for 9:00 class?"` Most ambient demos overshoot and become talkative; ours overshoots in the *other* direction — every event gets evaluated, and most of them get `ignore` or silent `remember`. The track winner here isn't whoever shows the most ambient signals; it's whoever shows the most *appropriate silence*. The "Why this cue?" tap-to-explain proves the engine considered five alternatives and chose to interrupt for a reason.

## Agents with Memory

Flow 2 — Memory Capture — is a memory demo that takes governance seriously. When the user says *"I should remember to ask Victor about the latency issue,"* AIR creates a `MemoryRecord` with explicit fields: `confidence`, `sensitivity`, `allowed_actions`, `requires_confirmation_for`, `expires_or_revalidates`, and `resurface_triggers`. The memory then surfaces *only* when a trigger matches — a calendar event involving Victor, or a planned 1:1. Most memory demos are vector-DB-of-everything; ours is the opposite. The judge sees: a memory created silently, surfaced 90 seconds later because of a context match, governed by sensitivity-tagged rules that prevent silent automated action on the same memory. That governance layer is the moat.

## Agents for Good

The privacy model and the cooldown gate both belong here. AIR refuses to over-notify (interruption budget downgrades a 2nd `suggest` within 10 minutes to silent `remember`), and refuses to silently act on high-privacy events (privacy-risk override force-escalates to `ask_permission`). For users with ADHD or attention-sensitivity needs, this is the difference between a useful tool and a hostile one. The 2-min demo shows the cooldown firing visibly — a second `suggest`-worthy event arrives, no second cue appears, but the relevant fact is captured to memory and resurfaces after the cooldown lifts. "Polite by construction" is the pitch; the demo makes it observable.

## Best Even G2 Integration

The G2 has a HUD and a mic, no camera. Most demos either ignore the form factor or treat the HUD like a phone screen. AIR's cue copy contract (`docs/glasses-cue-copy.md`) is built for the HUD: ≤40 chars target, no exclamation marks, no emoji, soft-question form for `suggest`/`ask_permission`, period-terminated short statement for `execute_preapproved` confirmations. Every demo cue in all three flows fits the budget and reads at a glance. The G2-specific story: a wearable agent that earned the right to speak by staying quiet most of the time, and earned the right to act by asking first.

---

## Judge-facing rubric companion

If a judge is scoring on a 1–5 per track, the demo should make these moments unambiguous:

| Track | The moment to watch for |
|---|---|
| Ambient Agents | The 8:24am cue appearing without the user asking — and the subsequent two `ignore`/`remember` decisions visible in the audit log. |
| Agents with Memory | The "Ask Victor about latency?" cue at minute ~1:30, surfaced *only* because a memory tagged with `person_mention: Victor` had a trigger fire. |
| Agents for Good | The visible cooldown — a 2nd suggest gets downgraded to remember (HUD stays blank), and the memory resurfaces 10 min later. |
| Best G2 Integration | Every cue. None breaks the char budget; none uses an exclamation mark; none reads as chatty. |
