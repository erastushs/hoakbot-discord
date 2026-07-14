# Hoak Bot

[![Node.js](https://img.shields.io/badge/node-%3E%3D22-339933?logo=node.js)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Discord.js](https://img.shields.io/badge/discord.js-v14-5865F2?logo=discord)](https://discord.js.org)

Hoak Bot is a production-oriented Discord bot and dashboard platform for a private community server. It runs a Discord.js v14 bot, a localhost-bound REST API, PostgreSQL-backed configuration and sessions, and a React dashboard for authenticated module configuration.

The bot supports general commands, voice automation, moderation, member and message logging, welcome cards, goodbye cards, live configuration, dashboard authentication, dashboard authorization, CSRF protection, security headers, rate limiting, and structured security audit logging.

---

## Features

### Discord Bot
- Slash commands and prefix commands for general interactions.
- Voice standby/follow/play automation with cooldowns and reconnect backoff.
- Moderation commands for kick, ban, timeout, warn, and clean workflows.
- Voice, member, message, and moderation logging.
- Custom welcome and goodbye cards with templates and background fallback.
- Role and owner-based operational permissions for bot commands.

### Modular Architecture
- Module-based structure for General, Voice, Moderation, Logging, Welcome, and Goodbye.
- Module manifests and settings metadata for dashboard rendering.
- Lightweight dependency injection container.
- Internal EventBus.
- Feature flags for module loading.
- Database-backed `ConfigurationService` with JSON defaults.
- Live configuration updates through runtime configuration events.

### REST API
- Embedded HTTP API under `/api/v1`.
- Standard success/error envelopes.
- Request validation through Zod schemas.
- Dashboard module metadata endpoints.
- Guild settings read and write endpoints.
- Health endpoint at `GET /api/v1/system/health`.
- Localhost binding for reverse-proxy deployment.

### Dashboard
- React 19 + Vite dashboard.
- Discord OAuth login.
- Server-side session bootstrap through `/api/v1/me`.
- Logout through `/api/v1/logout`.
- Authorized guild filtering.
- Guild switching.
- Metadata-driven module pages.
- Dynamic settings renderer.
- Dashboard API client with in-memory CSRF handling.
- Static production build output in `dist-dashboard/`.

### Security
- Discord OAuth authentication.
- Server-side sessions stored in PostgreSQL.
- HttpOnly session cookies with `SameSite=Lax` and `Secure` in production.
- Session expiration, revocation, and scheduled cleanup.
- Authorization middleware for guild-scoped dashboard APIs.
- Owner override through `OWNER_IDS`.
- Guild filtering and IDOR protection.
- CSRF protection for state-changing dashboard requests.
- HTTP security headers including CSP, HSTS, frame protection, referrer policy, permissions policy, and nosniff.
- Route-driven in-memory rate limiting for sensitive dashboard endpoints.
- Structured security audit logging for auth, authorization, CSRF, rate limit, and configuration events.
- Sensitive setting value masking in audit logs.
- Environment-aware CORS.
- Trusted proxy support for reverse-proxy client IP handling.

### Deployment Support
- PM2 configuration in `ecosystem.config.js`.
- Production build for backend and dashboard.
- PostgreSQL migration script.
- Health check endpoint for uptime monitoring.
- Reverse-proxy compatible API and dashboard topology.

---

## Architecture

```text
Discord
  |
  v
Bot Runtime
  |
  v
REST API (/api/v1)
  |
  v
Dashboard
  |
  v
Database (PostgreSQL)
```

Runtime details:

- Discord events and commands are handled by the bot runtime.
- The REST API runs in the bot process and is intended to bind to `127.0.0.1` behind a reverse proxy.
- The dashboard calls the REST API for authentication state, CSRF token retrieval, module metadata, guild selection, and settings updates.
- PostgreSQL stores guild settings, sessions, and moderation warning data.

---

## Project Structure

```text
src/
  adapters/              Discord client and command router adapters
  core/
    api/                 HTTP server, router, endpoints, middleware, security services
    auth/                OAuth, sessions, authorization, cookies, cleanup
    config/              Config loading, configuration providers, repositories
    container/           Dependency injection container
    database/            PostgreSQL adapter
    event-bus/           Internal event bus
    health/              Health checks
    logger/              Pino logger factory
    metrics/             In-process metrics
    settings/            Settings registry and metadata contracts
  modules/
    general/             General commands and settings
    voice/               Voice automation
    moderation/          Moderation commands and warning storage
    logging/             Logging module
    welcome/             Welcome card generation
    goodbye/             Goodbye card generation
  shared/                Shared command, image, template, and utility code

dashboard/
  src/                   React dashboard app
  tests/                 Dashboard component and integration tests

config/                  bot.json, permissions.json, feature-flags.json
migrations/              SQL migrations
scripts/                 Migration and Discord command scripts
tests/                   Backend unit and integration tests
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 22 |
| Language | TypeScript |
| Discord | discord.js v14, @discordjs/voice |
| Database | PostgreSQL via `postgres` |
| Canvas | @napi-rs/canvas |
| Validation | Zod |
| Logging | Pino |
| Dashboard | React 19, Vite 8, Tailwind CSS 4 |
| Process manager | PM2 |
| Tests | Vitest, jsdom, Testing Library |

---

## Requirements

- Node.js 22+
- npm
- Discord Bot Application
- Discord OAuth application credentials for dashboard login
- PostgreSQL database
- PM2 for production process management
- HTTPS reverse proxy for production dashboard access

---

## Installation

```bash
git clone https://github.com/erastus-hs/hoakbot.git
cd hoakbot
npm install
```

Create and edit `.env`:

```bash
cp .env.example .env
```

Run migrations:

```bash
npm run migrate
```

Build and start:

```bash
npm run build
npm start
```

Development mode:

```bash
npm run dev
```

Dashboard development server:

```bash
npm run dashboard:dev
```

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `BOT_TOKEN` | Yes | none | Discord bot token. |
| `CLIENT_ID` | Yes | none | Discord application client ID. |
| `DATABASE_URL` | Yes | none | PostgreSQL connection string. |
| `API_PORT` | No | `3000` | Local REST API port. |
| `NODE_ENV` | No | `production` | `development` or `production`. Enables secure cookie and HSTS behavior in production. |
| `LOG_LEVEL` | No | `info` | Pino log level. |
| `DISCORD_CLIENT_ID` | No | `CLIENT_ID` | Discord OAuth client ID for dashboard login. |
| `DISCORD_CLIENT_SECRET` | Production yes | empty in development | Discord OAuth client secret. Required when `NODE_ENV=production`. |
| `DISCORD_REDIRECT_URI` | Production yes | empty in development | Discord OAuth callback URL. Required when `NODE_ENV=production`. |
| `SESSION_DURATION` | No | `28800000` | Dashboard session lifetime in milliseconds. |
| `SESSION_CLEANUP_INTERVAL` | No | `3600000` | Interval for scheduled expired-session cleanup in milliseconds. |
| `COOKIE_NAME` | No | `hoak_session` | HttpOnly session cookie name. |
| `DASHBOARD_URL` | No | `http://localhost:5173` | Dashboard URL used after successful OAuth login. |
| `ALLOWED_ORIGIN` | No | origin from `DASHBOARD_URL` | Production CORS allowed origin override. |
| `TRUST_PROXY` | No | `false` | Enables trusted reverse-proxy use of `X-Forwarded-For` for client IP detection. |
| `GUILD_ID` | No | from `config/bot.json` | Primary guild ID. |
| `OWNER_IDS` | No | from `config/bot.json` | Comma-separated owner override Discord user IDs. |

Dashboard-only environment variable:

| Variable | Default | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `/api/v1` | Dashboard API base URL. Use `/api/v1` behind the same origin/reverse proxy. |

Production OAuth requirements:

- `DISCORD_REDIRECT_URI` must exactly match the callback URL configured in the Discord Developer Portal.
- The callback path is `/api/v1/auth/callback`.
- `DASHBOARD_URL` should be the dashboard origin users return to after login.

---

## REST API

The API is mounted at `/api/v1` and is intended to run behind an HTTPS reverse proxy.

| Method | Path | Description |
|---|---|---|
| `GET` | `/auth/login` | Start Discord OAuth login. |
| `GET` | `/auth/callback` | Complete Discord OAuth login. |
| `GET` | `/me` | Current dashboard session and authorized guilds. |
| `POST` | `/logout` | Revoke dashboard session and clear cookie. |
| `GET` | `/csrf` | Return in-memory dashboard CSRF token. |
| `GET` | `/modules` | List module manifests. |
| `GET` | `/modules/:id` | Get one module manifest. |
| `GET` | `/modules/:id/settings` | Get module settings metadata. |
| `GET` | `/guilds/:guildId/modules` | Get modules for an authorized guild. |
| `GET` | `/guilds/:guildId/settings` | Get guild settings. |
| `PATCH` | `/guilds/:guildId/settings` | Update guild settings. |
| `GET` | `/system/health` | Health check. |

Protected dashboard endpoints require a valid server-side session. Guild-scoped endpoints also require authorization for the requested guild.

---

## Security

### OAuth
- Discord OAuth uses the `identify` and `guilds` scopes.
- OAuth state is cryptographically random, expiring, and single-use.
- Failed and successful login attempts are audit logged.
- Production startup fails if OAuth secret or redirect URI is missing.

### Sessions
- Sessions are stored server-side in PostgreSQL.
- The browser receives only an opaque session cookie.
- Session cookies are HttpOnly, `SameSite=Lax`, path scoped to `/`, and explicitly expire.
- Cookies are marked `Secure` when `NODE_ENV=production`.
- Sessions support expiration, revocation, logout invalidation, and scheduled cleanup.

### Authorization
- Guild access is enforced server-side.
- Authorization supports Discord owner, Administrator, Manage Guild, and `OWNER_IDS` override.
- Guild filtering removes unauthorized guilds from dashboard bootstrap data.
- IDOR attempts against unknown or unauthorized guild IDs are denied.

### CSRF
- `GET`, `HEAD`, and `OPTIONS` requests are excluded.
- `POST`, `PUT`, `PATCH`, and `DELETE` requests require `X-CSRF-Token` for authenticated sessions.
- Tokens are stored in server-side session metadata and in dashboard memory only.
- Tokens expire with the session and are compared using constant-time comparison.

### HTTP Security Headers
- `Content-Security-Policy`
- `Strict-Transport-Security` in production
- `Permissions-Policy`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Content-Type-Options: nosniff`

### Rate Limiting
- In-memory sliding-window rate limiting for sensitive dashboard endpoints.
- Route-specific limits for OAuth login, OAuth callback, `/me`, `/csrf`, logout, and configuration writes.
- Returns `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset`.

### Security Audit Logging
- Structured audit events use the existing Pino logger.
- Events include login, logout, authentication failures, authorization denials, CSRF failures, rate-limit events, and configuration changes.
- Audit logs do not include cookies, session IDs, CSRF tokens, authorization headers, request bodies, OAuth tokens, or secrets.
- Settings marked `secret` are logged as `********`.

---

## Dashboard

The dashboard is implemented as a static Vite build and is served separately from the bot process in production.

Development:

```bash
# Terminal 1
npm run dev

# Terminal 2
npm run dashboard:dev
```

Optional `dashboard/.env.local`:

```env
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

Production dashboard deployment:

- Run `npm run build` to generate `dist-dashboard/`.
- Serve `dist-dashboard/` with Nginx or another HTTPS-capable web server.
- Proxy `/api/v1` to the local bot API port.
- Configure Discord OAuth callback to the public HTTPS callback URL.
- Set `DASHBOARD_URL` to the public dashboard origin.
- Set `ALLOWED_ORIGIN` if the allowed CORS origin differs from `DASHBOARD_URL`.

---

## Production Deployment

### Build

```bash
npm run build
```

This compiles the backend to `dist/` and dashboard assets to `dist-dashboard/`.

### Database

```bash
npm run migrate
```

Run migrations before starting the production service.

### PM2

```bash
pm2 start ecosystem.config.js --env production
```

The PM2 config runs `dist/bootstrap.js` in single-instance fork mode with memory restart, restart delay, and log files under `logs/`.

### HTTPS and Nginx

Recommended production topology:

- Nginx terminates HTTPS.
- Nginx serves `dist-dashboard/` as static files.
- Nginx proxies `/api/v1` to `http://127.0.0.1:3000/api/v1`.
- The bot API remains bound to `127.0.0.1`.
- `TRUST_PROXY=true` only when the reverse proxy overwrites forwarded client IP headers.
- `ALLOWED_ORIGIN` or `DASHBOARD_URL` must match the public dashboard origin.

### Health Check

```bash
curl http://127.0.0.1:3000/api/v1/system/health
```

---

## Security Notes

- Keep `NODE_ENV=production` in production so secure cookies and HSTS are active.
- Use HTTPS for all public dashboard traffic.
- Configure Discord OAuth callback URL exactly; mismatches will break login.
- Do not expose the local API port directly to the internet.
- Use a reverse proxy that overwrites inbound `X-Forwarded-For` before enabling `TRUST_PROXY=true`.
- Restrict production CORS to the dashboard origin.
- Back up the PostgreSQL database and `.env` securely.
- Treat `BOT_TOKEN`, `DISCORD_CLIENT_SECRET`, and `DATABASE_URL` as secrets.
- Review `npm audit` results before production upgrades; current Discord voice/runtime dependency advisories may require a separate dependency risk decision.

---

## Testing

| Command | Description |
|---|---|
| `npm run typecheck` | Type-check backend and dashboard. |
| `npm run lint` | Lint backend and dashboard. |
| `npm test` | Run backend and dashboard tests. |
| `npm run test:coverage` | Backend tests with coverage report. |
| `npm run dashboard:test` | Dashboard tests only. |

---

## npm Scripts

| Command | Description |
|---|---|
| `npm run build` | Compile backend and build dashboard. |
| `npm start` | Run compiled backend. |
| `npm run dev` | Start backend with `tsx watch`. |
| `npm run lint` | Run ESLint. |
| `npm run typecheck` | Run TypeScript checks. |
| `npm test` | Run all tests. |
| `npm run migrate` | Run database migrations. |
| `npm run deploy:commands` | Register Discord slash commands. |
| `npm run list:commands` | List registered commands. |
| `npm run clear:global-commands` | Remove global slash commands. |
| `npm run dashboard:dev` | Start dashboard dev server. |
| `npm run dashboard:build` | Build dashboard assets. |
| `npm run dashboard:test` | Run dashboard tests. |

---

## Version History

| Version | Highlights |
|---|---|
| v1 | Initial bot with prefix commands, voice automation, and basic moderation. |
| v2 | Modular architecture, logging module, welcome/goodbye cards, expanded test coverage. |
| v3.0 | Configuration platform, database-backed settings, REST API, dashboard foundation, live config. |
| v3.1 | Dashboard OAuth, server-side sessions, authorization, API protection, security hardening, and production readiness fixes. |

---

## Roadmap

See [docs/ROADMAP.md](docs/ROADMAP.md) for completed milestones and upcoming deployment/validation work. The previous root roadmap is archived under `docs/archive/legacy-roadmap/` as historical context.
