<!--
AIR pitch deck — Marp-compatible markdown.

Render:
  npx @marp-team/marp-cli docs/pitch-deck.md -o pitch-deck.pdf
  npx @marp-team/marp-cli docs/pitch-deck.md -o pitch-deck.html

Or open in VS Code with the Marp extension.

Each `---` is a new slide. Speaker notes live in HTML comments above
the slide body so they don't render but remain editable.
-->

---
marp: true
theme: default
paginate: true
header: 'AIR'
footer: 'The Ambient Intent Router'
---

# AIR

### The Ambient Intent Router

> An orchestrator for agents that know when to **stay silent**, when to **remember**, and when to **act**.

<!-- Speaker note: 10-second open. Don't define "ambient agent" yet — the title slide is the hook, not the explanation. Pause two beats after "act," then go. -->

---

## The problem

> **Agents are always on, and they don't know when to shut up.**

A wearable agent has to answer one question chatbots and computer-use agents never face:

> _Should I say something right now, remember this silently, ask permission, or do nothing?_

On a wrist or a pair of glasses, **eagerness isn't a feature. It's the failure mode.**

<!-- Speaker note: 25 seconds. Land on "eagerness is the failure mode." That single beat is the inversion every later slide builds on. -->

---

## The insight

The bottleneck isn't reasoning. It's **interruption policy.**

Claude, OpenAI, LangChain are all excellent at *answering*. **None of them decide what deserves a human's attention in the first place.**

The same is true of memory. The frontier isn't a vector database of everything you ever said.

> The frontier is **useful memory that knows when not to use itself.**

<!-- Speaker note: 25 seconds. The two halves matter — "interruption policy" then "memory governance." This is where they realize we're not pitching a model wrapper. -->

---

## The wedge

**AIR is the policy + memory layer that decides when an always-on agent should stay silent, remember, ask, or act** — and routes the rest to whichever model is best.

We own four things:

1. **Salience scoring** — every event gets a weighted score across urgency, value, and risk.
2. **Interruption budget** — if we just spoke up, we don't speak up again.
3. **Memory governance** — every memory carries a confidence, sensitivity, allowed-actions tag, and expiry.
4. **Permissioned action ladder** — from `ignore` at the bottom to `act on its own` at the top. Each rung is *earned*.

> _Each one is a written contract in our docs. The code follows._

<!-- Speaker note: 40 seconds. This is the dense slide. Don't read every bullet — just name them. The "written contract" closer is the credibility line. -->

---

## Why now

The Even G2 ships **without a camera**, with a **glanceable HUD**, and a four-mic array.

Ambient cognition finally has a surface that **rewards restraint** instead of punishing it.

A wearable that interrupts too often is an embarrassment.

> A wearable that **earned the right to speak** by staying quiet, and **earned the right to act** by asking first, is a category.

<!-- Speaker note: 25 seconds. The G2 line is for the host's track. Keep it tight, don't pander. -->

---

## Proof — one demo, three flows, four tracks

| Flow | What you see | Track |
|---|---|---|
| **Leaving Mode** | One earned cue at 8:24 AM. Two visible silences. Audit log shows the engine considered five alternatives. | **Ambient Agents** |
| **Memory Capture** | Casual self-reminder captured silently. Surfaces 90s later — only because a person-mention trigger fires for "Victor." | **Agents with Memory** |
| **Consentful Action** | Running-late detection produces an ask. One tap sends. User can graduate to a scoped, revocable preapproval. | **Agents for Good** |

Every cue is **≤ 40 chars, no exclamation marks, no chat aesthetic** — that's the **Best Even G2 Integration** track.

<!-- Speaker note: 30 seconds. Don't run the demo here — set up what they're about to see in the live walkthrough. The four-tracks-from-one-demo line is the lift. -->

---

## What we're not

- Not a model.
- Not a framework.
- Not a chat product.
- Not a vector database of everything you ever said.

> A general agent is powerful.
> An always-on wearable agent must be **polite.**

The winning demo is not the one that does the most. It's the one that feels like it understands **when not to bother you.**

<!-- Speaker note: 20 seconds. The "must be polite" line is the headline. Pause after it. The next slide is the close. -->

---

## What we shipped

- **13 spec docs** — context schema, policy rules, glasses cue copy, privacy model, two flow specs, demo script, hackathon-track mapping, G2 SDK alignment.
- **30 passing tests** — six-gate policy pipeline, salience formula, cooldown, memory governance, three flows.
- **CLI runner** — every event → score → decision → cue annotated end-to-end (`npm run demo`).
- **Plugin architecture** — `EventSourceAdapter` + `CueRenderer` interfaces so calendar / location / audio / non-G2 sources plug in without touching the engine.
- **G2 SDK audit** — every API surface mapped to our system, gaps flagged, none in the policy core.

<!-- Speaker note: 25 seconds. Optional slide — show only if a judge asks "how real is this?" Otherwise skip and go to closing. -->

---

## Closing

**That's AIR.**

**The attention layer for ambient agents.**

We decide when to stay silent, when to remember, when to ask, and when to act.

> _Everything else is just a model call._

<!-- Speaker note: 15 seconds. Land on the closer, smile, hand mic to next presenter or take Q&A. Do not improvise past "model call." -->

---

## Reference (not spoken)

- `pitch.md` — the long-form narrative this deck compresses.
- `docs/policy-rules.md` — the formula, the threshold table, the cooldown.
- `docs/glasses-cue-copy.md` — every HUD string we'll ever show.
- `docs/g2-alignment.md` — how AIR maps to the Even G2 SDK surface.
- `docs/demo-script.md` — the 2-minute walkthrough.
- `docs/hackathon-tracks.md` — per-track scoring guide.
- `src/` — `context/`, `memory/`, `salience/`, `policy/`, `actions/`, `api/`, `demo/`, `adapters/`. 30/30 tests passing.
