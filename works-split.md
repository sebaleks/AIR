Yes. Split the work by architecture/planning vs. implementation/integration, not by “who writes more code.”

Claude is usually very strong at big-picture design, product reasoning, UX flows, edge cases, and writing clear specs. Codex is very strong at working inside the repo, editing files, running tests, wiring modules, and iterating on implementation. Officially, Codex is positioned as a coding agent that can read, edit, and run code in the IDE or delegate tasks to Codex Cloud, while Claude Code is described as an agentic coding system that reads a codebase, changes files, runs tests, and delivers committed code.  

For SenseRoute/Rattention, I’d split it like this:
Your teammate on Claude: Product architect + adversarial reviewer

Give him the work that benefits from deep reasoning and clarity:

1. Product spec
He should define the exact demo flow:

“The user is about to leave for class/work. The agent detects context, decides whether to interrupt, shows a glasses cue, and optionally prepares an action.”

He should write:

docs/product-spec.md
docs/demo-script.md
docs/privacy-model.md
docs/user-stories.md

2. Context schema design
He should design the data model before you code it:

ContextEvent
MemoryRecord
SalienceScore
PolicyDecision
SuggestedAction
UserPermission

3. Policy rules
He should define the logic in English first:

If urgency is high, confidence is high, and privacy risk is low → surface cue.
If confidence is medium and not urgent → remember silently.
If action is irreversible → ask permission.
If user is in conversation mode → reduce interruptions.

4. UX copy for glasses
This is important. He should write all the tiny cue messages:

Leave in 6 min?
Route ready.
Ask Victor about latency?
Bring charger?
Text Alex you’re 5 min late?

5. Red-team review
He should constantly ask:

    Is this creepy?
    Is this useful?
    Did we interrupt too much?
    Did we store sensitive memory?
    Does the demo tell a coherent story?

Claude should be the taste, product, safety, and architecture brain.
You on Codex: Repo owner + implementation lead

You should own anything that needs actual code edits, testing, and wiring:

1. Scaffold the project
Use Codex to create:

src/
  context/
  memory/
  policy/
  salience/
  actions/
  api/
  demo/
tests/
docs/
AGENTS.md
README.md

2. Implement the core engine
You build the actual orchestrator:

ingestContextEvent()
updateMemory()
scoreSalience()
makePolicyDecision()
renderGlassesCue()
requestPermission()

3. Build API/demo
Codex should implement:

POST /events
GET /state
POST /demo/leaving-mode
POST /demo/conversation-memory
POST /demo/permissioned-action

4. Build tests
Codex is perfect for this:

tests/salience.test.ts
tests/policy.test.ts
tests/memory.test.ts
tests/demo.test.ts

5. Keep the repo clean
You own:

npm run lint
npm test
git status
git diff

Codex should be your repo mechanic and implementation engine.
Best split by milestone
Milestone 1: Define the product

Claude teammate does:

docs/product-spec.md
docs/demo-script.md
docs/context-schema.md

You do with Codex:

Initialize TypeScript project.
Create repo structure.
Add AGENTS.md.
Add README.md.
Add basic test setup.

Milestone 2: Build the orchestrator core

Claude teammate does:

Define salience scoring rubric.
Define policy decision table.
Define privacy/permission rules.

You do with Codex:

Implement salience engine.
Implement policy engine.
Implement in-memory event store.
Add unit tests.

Milestone 3: Build the demo

Claude teammate does:

Write the exact demo script.
Write wearable cue copy.
Prepare pitch explanation.
Identify failure modes.

You do with Codex:

Build API endpoints.
Build CLI/demo page.
Create seeded demo scenarios.
Wire context event → memory → salience → cue.

Milestone 4: Polish

Claude teammate does:

Pitch deck / README narrative / judging criteria mapping.

You do with Codex:

Fix bugs.
Add screenshots/GIF instructions.
Make install/run commands painless.
Prepare final demo branch.

Concrete work assignment

Give your teammate this prompt for Claude:

We are building SenseRoute/Rattention, an ambient-agent orchestrator for AI glasses. It decides when to stay silent, when to remember, when to show a cue, and when to ask permission to act.

Your role is product architect and red-team reviewer. Do not write implementation code yet. Produce four concise docs:

1. docs/product-spec.md
- One-sentence product thesis
- Target user
- Core demo flow
- What makes this different from a chatbot/model router
- Success criteria for a hackathon demo

2. docs/context-schema.md
- Define ContextEvent, MemoryRecord, SalienceScore, PolicyDecision, SuggestedAction, UserPermission
- Include TypeScript-style interfaces, but keep this as a spec
- Include 3 example events

3. docs/policy-rules.md
- Decision table for ignore / remember / suggest / ask / act
- Privacy-risk levels
- Permission levels
- Interruption rules for wearable glasses

4. docs/demo-script.md
- 2-minute demo script
- Exact user scenario
- Exact glasses cue copy
- What the judge should understand by the end

Optimize for a hackathon prototype: clear, small, buildable in one day.

Then use this prompt for Codex:

We are building SenseRoute/Rattention, an ambient-agent orchestrator for AI glasses. It routes context, memory, and user attention. The system decides when to stay silent, when to remember, when to surface a wearable cue, and when to ask permission to act.

Your role is implementation lead. Scaffold a clean TypeScript project with tests.

Create:
- package.json with scripts: dev, build, test, lint
- tsconfig.json
- src/context/
- src/memory/
- src/salience/
- src/policy/
- src/actions/
- src/api/
- src/demo/
- tests/

Implement a minimal working prototype:
1. ContextEvent type and event ingestion
2. In-memory MemoryStore
3. SalienceEngine that scores urgency, confidence, user_value, annoyance_cost, and privacy_risk
4. PolicyEngine that returns one of: ignore, remember, suggest, ask_permission, execute_preapproved
5. Demo scenario: leaving_mode
6. API endpoints:
   - POST /events
   - GET /state
   - POST /demo/leaving-mode
7. Unit tests for salience and policy decisions

Do not add unnecessary dependencies. Prefer simple, readable TypeScript. After implementation, run tests and summarize what changed.

How you two should collaborate

Use one shared repo and split branches:

main
  ├── seb/implementation-core
  └── teammate/product-specs

He opens PRs for docs/specs. You open PRs for code. Then you use his docs as source material for your Codex prompts.

Simple rhythm:

    He writes product/spec docs with Claude.
    You feed those docs into Codex.
    Codex implements.
    He reviews whether the behavior matches the intended human experience.
    You fix.

That division is strong because Claude is shaping the “what should this agent do and why?” while Codex is handling “make the repo actually work.”