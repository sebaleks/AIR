## Coordination — read first

**Before doing any work, read `HANDOFF.md`.** It's the living log of what's in flight, what interfaces have been agreed on, and what's blocking each side. **Update it whenever you finish work, hit a blocker, or change a shared interface** — the other agent's next session depends on it.

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