# AIR — the Ambient Intent Router

> An orchestrator for agents that know when to stay silent, when to remember, and when to act.

---

## Problem

The problem is that agents are always on, and they don't know when to shut up.

A wearable agent has to answer one question that chatbots and computer-use agents never face: should I say something right now, remember this silently, ask permission, or do nothing?

On a wrist or a pair of glasses, eagerness isn't a feature. It's the failure mode.

---

## Insight

The bottleneck isn't reasoning. It's **interruption policy.**

Claude, OpenAI, and LangChain are all excellent at answering. None of them decide what deserves a human's attention in the first place. On a wearable, that decision is the product.

The same is true of memory. The frontier isn't a vector database of everything the user ever said. That's the obvious wrapper path, and it's creepy. The frontier is **useful memory that knows when not to use itself.**

---

## Wedge

**AIR is the policy and memory layer that decides when an always-on agent should stay silent, remember, ask, or act** — and routes the rest to whichever model is best.

We are the attention layer that sits upstream of the model — and on a wearable, that's where the product actually lives.

We own four things.

First, **salience scoring** — every event gets a weighted score across urgency, value, and risk. Most score low. They get ignored, or remembered silently.

Second, an **interruption budget.** If we just spoke up in the last ten minutes, we don't speak up again. The second cue gets captured silently instead.

Third, **memory governance.** Every memory carries a confidence score, a sensitivity tag, what it's allowed to be used for, and when it expires. Sensitive memories never trigger silent action — no matter how confident we get.

And fourth, a **permissioned action ladder** — from ignore at the bottom, to act on its own at the top. Anything risky gets bumped back to "ask first," even when the user has already pre-approved it.

Each one is a written contract in our docs. The code follows.

---

## Why now

The Even G2 ships without a camera, and with a glanceable heads-up display. Ambient cognition finally has a surface that rewards restraint instead of punishing it.

A wearable that interrupts too often is an embarrassment. A wearable that earned the right to speak by staying quiet, and earned the right to act by asking first, is a category. The hardware is finally honest enough to make that the differentiator.

---

## Proof

One demo. Three flows. Each one earns a different track without changing engines.

The first flow is **Leaving Mode.** At 8:24 in the morning, the user gets one cue, and then two visible silences. The audit log shows the engine considered five alternatives, and chose to interrupt for a reason. That's the Ambient Agents track.

The second flow is **Memory Capture.** The user casually says, "I should remember to ask Victor about latency." We capture that silently. Ninety seconds later it resurfaces — but only because a person-mention trigger fires for Victor, and only in a form that respects the sensitivity rules. That's the Agents with Memory track.

The third flow is **Consentful Action.** Running-late detection produces an ask-permission cue. One tap sends the message. The user can graduate to a scoped, revocable pre-approval. And the cooldown gate guarantees the second cue never even appears. That's the Agents for Good track.

Every cue in all three flows fits the G2 display budget. Forty characters or fewer. No exclamation marks. No chat aesthetic. Soft-question form for suggestions and asks. Period-terminated short statements for confirmations. That's the **Best Even G2 Integration** track.

---

## What we're not

We're not a model. We're not a framework. We're not a chat product. We're not a vector database of everything you ever said.

A general agent is powerful. An always-on wearable agent must be **polite.**

The winning demo is not the one that does the most. It's the one that feels like it understands when not to bother you.

---

## Closing

That's AIR. The attention layer for ambient agents. We decide when to stay silent, when to remember, when to ask, and when to act.

Everything else is just a model call.

---

## Reference (not spoken)

- `README.md` — architecture diagram, API surface, quick start.
- `docs/product-spec.md` — thesis, target user, success criteria.
- `docs/context-schema.md` — typed shapes for every entity.
- `docs/policy-rules.md` — pipeline, formula, thresholds, cooldown, action ladder.
- `docs/glasses-cue-copy.md` — every HUD string, voice + tone contract.
- `docs/privacy-model.md` — data categories, retention, opt-in / revoke UX.
- `docs/flow-memory-capture.md` and `docs/flow-consentful-action.md` — Flows 2 & 3.
- `docs/demo-script.md` — the 2-minute walkthrough.
- `docs/hackathon-tracks.md` — per-track scoring guide.
- `src/` — `context/`, `memory/`, `salience/`, `policy/`, `actions/`, `api/`, `demo/`. 25/25 tests passing.
