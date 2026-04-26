## Tech Stack
- Runtime: Node.js 22.x
- Language: TypeScript (strict mode)
- Framework: Native Node HTTP for baseline API prototype
- Storage: In-memory (baseline); can evolve to Prisma-backed storage later

## Commands
- Install deps: `npm install`
- Build: `npm run build`
- Test: `npm test`
- Lint: `npm run lint`

## Coding Conventions
- Use async/await instead of callbacks.
- Never catch an error without logging.
- Keep context modules (`src/context/`) separate from memory modules (`src/memory/`).

## Project Rules
- Do not commit `.env` or secrets.
- Ask before adding new dependencies or modifying database schema.
- All API endpoints should have corresponding unit tests.
