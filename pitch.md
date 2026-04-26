I’ll frame this like a hackathon/product strategy answer: what “orchestrator” should mean, where wrappers are weak, and what concrete wedge could beat generic agent products on wearable AI.Thought for 5sYou’re right to worry about becoming “just a wrapper.” A model wrapper will get crushed. A context + action orchestrator for wearable agents could be valuable, especially for Even G2, because the winning layer is not “call GPT better.” It is:

know what is happening, decide whether to interrupt, remember what matters, and route the right action to the right tool with consent.

Even G2 seems especially suited for this because it is not a camera-first device; Even says G2 uses an integrated microphone rather than a camera, with a heads-up display designed to be available when needed and out of the way when not. That means your differentiator should be ambient, low-friction cognition, not “visual surveillance agent.” 
The big idea: build the “attention router,” not another agent
Most agent frameworks already handle graphs, tools, memory, and checkpoints. LangGraph, for example, is built around stateful workflows with nodes, edges, checkpoints, interrupts, and human approval patterns.  Claude has computer-use loops; OpenAI has agent tooling with web/file/computer-use style capabilities; the market is already full of orchestration frameworks. 
So your wedge should be:
“The orchestrator decides what deserves the user’s attention while they are living their life.”
That is meaningfully different from a chatbot or task agent.
What would make it better than the market?
1. Context arbitration: not everything should become an action
Most agent demos are too eager. A wearable agent must answer:
Should I say something right now, remember this silently, ask permission, or do nothing?
That can be your core engine.
Example:
User says: “Damn, that’s a cool bag.”
Bad wrapper: sends phrase to GPT, returns generic shopping search.
Better orchestrator:


Detects low-confidence casual interest.


Stores a lightweight memory: “User noticed black leather crossbody bag, likes minimalist style.”


Waits until phone unlock / later shopping context.


Shows: “I found similar bags under $150. Want to see them?”


Only searches or purchases after explicit permission.


This is not a model problem. It is timing, salience, privacy, and action policy.
2. Memory with decay, confidence, and usefulness
Do not just create a vector DB of everything. That is the obvious wrapper path.
Build memory as structured state:
Observation → Candidate memory → Confidence score → User value score → Expiry → Allowed use
For example:
{  "memory": "User usually leaves for campus around 8:35am on weekdays",  "source": "repeated morning location pattern",  "confidence": 0.82,  "sensitivity": "location_routine",  "allowed_actions": ["reminder", "route_suggestion"],  "requires_confirmation_for": ["booking", "messaging"],  "expires_or_revalidates": "30 days"}
That beats market agents because most memory systems are either too dumb or too creepy. The frontier is useful memory that knows when not to use itself.
3. A permissioned action graph
The speech you pasted is dead-on: agents can reason faster than apps expose safe APIs. Even now, many agent systems rely on browser/computer-use hacks because apps do not expose clean agent interfaces. Claude’s computer-use docs describe an agent loop that interacts with tools in a containerized computer environment, which shows where the ecosystem is heading but also why it is still clunky. 
Your orchestrator should have action levels:
LevelAction typeExampleL0Observe only“User mentioned they may be late.”L1Remember“Store that Monday meetings are stressful.”L2Suggest“Leave in 10 minutes to arrive on time.”L3Prepare“Draft the text to your teammate.”L4Execute with confirmation“Send the text?”L5Execute automaticallyOnly for pre-approved narrow tasks
This is a better hackathon concept than “we built an agent that books Uber,” because the hard problem is not just tool use. It is when the agent is allowed to act.
A strong product concept
I would build:
AmbientOS: a consent-aware orchestrator for wearable agents
One sentence:

AmbientOS turns passive wearable signals into timely, permissioned micro-actions by deciding what to ignore, what to remember, what to surface, and what to execute.

For the hackathon tracks, it fits all three:
Ambient Agents: notices context before the user asks.
Agents with Memory: learns routines, preferences, and recurring needs.
Agents for Good: can reduce cognitive load for ADHD, anxiety, accessibility, forgetfulness, or navigation support.
Best Even G2 Integration: uses the glasses as the subtle display layer, not just another notification screen.
Demo that would actually feel magical
Build a narrow demo around one day-in-the-life scenario.
Demo: “Leaving Mode”
Signals:


Time of day


Calendar


User speech


Phone location / movement


Known routine


Glasses display


Optional weather/transit/API tools


Scenario:
User is getting ready to leave and says nothing directly to the agent.
The orchestrator infers:
It is 8:24am.User usually leaves by 8:35am.Calendar says class at 9:00am.Travel time is 28 minutes.User has not left yet.
Glasses show:

“Leave in 6 min for 9:00 class. Want me to open route?”

Then if user says “yes”:

“Route ready. Also, bring laptop charger? You usually need it on Mondays.”

That feels like an agent because it anticipates without becoming annoying.
How to avoid being just a wrapper
Do not pitch:

“We use GPT-5.5 plus LangGraph plus APIs to make a personal assistant.”

Everyone can do that.
Pitch:

“We built the policy and memory layer that decides when an always-on agent should stay silent, remember, interrupt, or act.”

That is the durable part.
Your moat is not the LLM. Your moat is:


Context schema — how you represent user state.


Interruption policy — when the wearable should surface something.


Memory governance — what gets remembered, forgotten, or confirmed.


Action permissions — what the agent can do without being dangerous.


Wearable UX — extremely short, glanceable outputs.


Architecture
Wearable / Phone Signals        ↓Context Normalizer        ↓State Store + Memory Store        ↓Salience Engine        ↓Policy Engine        ↓Agent Router   ↙       ↓        ↘Memory   Tools    LLM        ↓Glasses Display / Phone Action / Silent Log
Components
Context Normalizer
Turns raw signals into clean events:
{  "event_type": "possible_departure",  "time": "08:24",  "confidence": 0.74,  "evidence": ["weekday", "movement", "calendar_class_9am"]}
Salience Engine
Scores whether this matters now:
salience = urgency + usefulness + confidence - annoyance - privacy_risk
Policy Engine
Decides:
ignore / remember / suggest / ask / act
Agent Router
Chooses the right model/tool:


LLM for reasoning


Calendar API for schedule


Maps/transit API for route


Memory DB for patterns


Notification layer for G2 display


Glasses UX Layer
Keeps outputs tiny:
Leave in 6 min?Route ready.Charger?Running late — text Alex?
The key technical differentiator: interruption scoring
For always-on agents, the question is not “can the model answer?” It is “should it interrupt?”
A simple scoring function could be:
score = (    0.35 * urgency    + 0.25 * confidence    + 0.20 * user_value    + 0.10 * reversibility    - 0.25 * annoyance_cost    - 0.30 * privacy_risk)
Then:
score < 0.30 → do nothing0.30–0.50 → remember silently0.50–0.70 → surface suggestion0.70–0.90 → ask to act> 0.90 → act only if pre-approved
That is a much better “orchestrator” than a generic multi-agent wrapper.
Best hackathon version
Build only 3 flows:
Flow 1: Proactive routine support
“Leave soon for class/work.”
Uses calendar + learned routine + location/motion.
Flow 2: Memory capture
User casually says:

“I should remember to ask Victor about the latency issue.”

Agent silently captures candidate memory, then later surfaces:

“Ask Victor about latency?”

Flow 3: Consentful action
User is running late.
Agent displays:

“Text teammate: ‘Running 5 min late’?”

User taps/says yes.
This gives you ambient context, memory, and action without needing a huge app ecosystem.
Why this could beat market leaders in the hackathon setting
The big players are building general agents. Your advantage is focus:

A general agent is powerful, but an always-on wearable agent must be polite.

That is the insight. The winning demo is not the one that does the most. It is the one that feels like it understands when not to bother you.
My recommended positioning
Call it something like:
Ambient Intent Router
or
Contextual Action Layer for Wearable Agents
Tagline:

“An orchestrator for agents that know when to stay silent, when to remember, and when to act.”

This is not just a wrapper around the market leader. Use the market leader as one reasoning module, but make your actual product the memory, context, permission, and interruption layer. That is the part the model companies are least likely to solve well for every niche use case, and it maps perfectly to glasses.
Sources