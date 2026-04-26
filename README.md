# SenseRoute
An ambient-agent orchestrator that routes context, memory, and user attention for wearable AI. It decides when to stay silent, when to remember, when to surface a cue, and when to ask permission to act.

## Tech Stack
- Runtime: Node.js 22.x
- Language: TypeScript (strict mode)
- Framework: Express or Fastify for API
- Storage: SQLite or PostgreSQL via Prisma

## Commands
- Install deps: `npm install`
- Build: `npm run build` (uses TypeScript compiler)
- Test: `npm test` (runs `node --test` with Jest or Vitest)
- Lint: `npm run lint`

## Coding Conventions
- Use async/await instead of callbacks.
- Never catch an error without logging.
- Keep context modules (e.g., `src/context/`) separate from memory modules (`src/memory/`).

## Project Rules
- Do not commit `.env` or secrets.
- Ask before adding new dependencies or modifying database schema.
- All API endpoints must have corresponding unit tests.