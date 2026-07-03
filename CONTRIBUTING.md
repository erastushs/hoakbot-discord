# Contributing to Hoak Bot

## Setup

```bash
git clone https://github.com/erastushs/hoakbot.git
cd hoakbot
npm install
cp .env.example .env
```

Fill in `.env` with your bot token, client ID, and database URL.

## Branch strategy

- `main` — production branch, deployed to VPS
- Feature branches — `feat/description`
- Fix branches — `fix/description`
- Always branch from `main`

## Coding standards

- TypeScript strict mode
- All exports have `.js` extensions (Node16 ESM)
- Prefer `type` imports for type-only usage
- No numeric literals in embed colors — use `COLORS.*`
- Error strings centralized in `src/shared/errors/errors.ts`
- Commands extend `BaseCommand` and use `this.success()` / `this.error()` etc.

## Testing

- `npm test` — run all tests
- `npm run test:coverage` — run with coverage report
- Tests live in `tests/unit/` and `tests/integration/`
- Mock external dependencies; do not connect to Discord or PostgreSQL in tests

## Before submitting a PR

```bash
npm run lint
npm run typecheck
npm run build
npm test
```

## Commit messages

Use [conventional commits](https://www.conventionalcommits.org/):

```
feat(module): description
fix(module): description
test(module): description
chore: description
docs: description
```
