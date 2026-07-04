# Hoak Bot

[![Node.js](https://img.shields.io/badge/node-%3E%3D22-339933?logo=node.js)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Discord.js](https://img.shields.io/badge/discord.js-v14-5865F2?logo=discord)](https://discord.js.org)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

A modular Discord bot for a private community server. Built with TypeScript on Discord.js v14 with PostgreSQL persistence, database-backed configuration, a local REST API, and a dashboard platform.

The bot handles general interactions, voice channel automation, moderation, member logging, and generates custom welcome and goodbye cards. All runtime settings are configurable without code changes via the database.

**Dashboard**: The platform is fully implemented but intentionally not deployed. Public deployment is blocked until Discord OAuth authentication is completed.

---

## Features

### General
- Slash commands (`/ping`, `/help`)
- Case-insensitive prefix commands (`hoakping`, `hoakhelp`, `hoakp`)
- Shared command registry with alias support

### Voice
- Automatically joins a configured standby voice channel on startup
- Follows members to their channel and plays a configurable sound, then returns to standby
- 6-state machine: `IDLE` → `MOVING` → `WAITING` → `PLAYING` → `RETURNING` → `COOLDOWN`
- Cooldown protection and exponential backoff reconnection

### Logging
- Voice join, leave, and move logging with embeds
- Member profile change logging (nickname, display name, avatar, roles)
- Message deletion, editing, and bulk deletion
- Moderation action logging (kick, ban, timeout, warn, clean)

### Moderation
- `/kick`, `/ban`, `/timeout`, `/warn`, `/clean` commands
- Role-based permission levels (admin, moderator, trusted)
- Persistent warning system with database storage

### Welcome & Goodbye
- Custom welcome cards with configurable backgrounds, templates, Unicode fonts
- Custom goodbye cards with the same system
- Template variables (`{mention}`, `{server}`, `{membercount}`)
- Three-tier background fallback (configured → bundled default → solid color)
- Auto-scaling for long usernames
- Font stack: Noto Sans, Noto Sans CJK JP, Noto Color Emoji

### Core Platform
- Lightweight dependency injection container
- Internal EventBus with typed events
- Database-backed `ConfigurationService` with JSON file fallback
- Schema-validated settings (Zod) with per-guild storage
- Metadata-driven settings registry for UI rendering
- Live configuration without restart (event bus + runtime mutation)
- Structured logging via Pino (JSON output in production)
- PostgreSQL adapter with connection pooling (Supabase)
- Subsystem health checks with startup summary
- In-process metrics (counters, gauges, timers)
- Module-based architecture with feature flags
- Bounded image cache (max 20 entries)
- Global crash handlers (`unhandledRejection`, `uncaughtException`)
- Localhost-only REST API in production

---

## Architecture

```
Discord
   │
   ▼
 Modules ───────────┐
 (General, Voice,   │
  Logging, Welcome, │
  Goodbye,          │
  Moderation)       │
   │                │
   ├─► TemplateService
   ├─► MemberCardBuilder (canvas)
   ├─► CommandRegistry
   │
   ▼
 ConfigurationService
   │
   ├─► DatabaseConfigProvider
   │        ├─► GuildSettingsRepository (PostgreSQL)
   │        └─► JsonConfigProvider (bot.json fallback)
   │
   ├─► SettingsRegistry
   │        └─► Zod validation, change notifications
   │
   ▼
 REST API ──► Dashboard Platform
 (localhost     (implemented,
  only)          not deployed)
```

---

## Project Structure

```
src/
  adapters/              Discord client factory
  core/
    api/                 HTTP server, router, endpoints, validation
    config/              ConfigService, ConfigurationService, providers
    container/           Lightweight DI container
    database/            PostgreSQL adapter (Supabase)
    errors/              Typed error classes
    event-bus/           Internal EventBus with typed events
    health/              HealthService and check registry
    logger/              Pino logger factory
    metrics/             Counters, gauges, timers
    permissions/         Role-based permission levels
    settings/            Settings registry, metadata types
  modules/
    general/             /ping, /help commands
    voice/               Voice follow-and-play with state machine
    logging/             Member, voice, message, moderation logging
    moderation/          Kick, ban, timeout, warn, clean commands
    welcome/             Welcome card generation and templates
    goodbye/             Goodbye card generation and templates
  shared/
    builders/            Member card canvas builder
    image/               Image service (canvas wrapper, bounded cache)
    template/            Template renderer for welcome/goodbye messages

dashboard/
  src/                   React app (Vite, Tailwind CSS, Lucide icons)
  public/                Static assets (favicon)
  tests/                 Component tests (Vitest + jsdom)

config/                  bot.json, permissions.json, feature-flags.json
assets/
  sounds/                hoak.mp3
  images/                Default welcome/goodbye background assets
scripts/                 deploy-commands, list-commands, migrate
tests/
  unit/                  Unit tests (Vitest)
  integration/           Integration tests
migrations/              SQL migration files
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 22 |
| Language | TypeScript 5.9 |
| Discord | discord.js v14, @discordjs/voice |
| Database | PostgreSQL (postgres) |
| Canvas | @napi-rs/canvas |
| Validation | Zod |
| Logging | Pino |
| Process | PM2 |
| Dashboard | React 19, Vite 8, Tailwind CSS 4, Vitest |

---

## Requirements

- Node.js 22+
- npm
- A Discord Bot Application with token (see [Discord Developer Portal](https://discord.com/developers/applications))
- PostgreSQL database (Supabase or self-hosted)
- PM2 (for production deployment)

---

## Installation

```bash
git clone https://github.com/erastus-hs/hoakbot.git
cd hoakbot
npm install
```

### Configuration

Secrets and environment variables are configured in `.env`. Copy the template and fill in your values:

```bash
cp .env.example .env
```

Edit `.env` with your secrets. Runtime configuration (prefix, voice channels, templates) is stored in the database via the dashboard API. The `config/bot.json` file provides default values during initial setup.

### Database Migration

```bash
npm run migrate
```

This creates the required `guild_settings` and `warnings` tables.

### Build & Start

```bash
npm run build
npm start
```

For development with auto-reload:

```bash
npm run dev
```

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `BOT_TOKEN` | Yes | – | Discord bot token |
| `CLIENT_ID` | Yes | – | Discord application client ID |
| `DATABASE_URL` | Yes | – | PostgreSQL connection string |
| `API_PORT` | No | `3000` | REST API port (localhost-only in production) |
| `GUILD_ID` | No | from `bot.json` | Primary guild ID |
| `OWNER_IDS` | No | from `bot.json` | Comma-separated owner IDs |
| `NODE_ENV` | No | `production` | `development` or `production` |
| `LOG_LEVEL` | No | `info` | `trace`, `debug`, `info`, `warn`, `error`, `fatal` |

The `DATABASE_URL` expects a full PostgreSQL connection string:

```
postgresql://user:password@host:port/database
```

---

## Running

### Development

```bash
npm run dev
```

Starts the bot with `tsx watch` for auto-reload on file changes.

### Production

```bash
npm run build
npm start
```

Or with PM2:

```bash
pm2 start ecosystem.config.js --env production
```

### Health Check

```bash
curl http://127.0.0.1:3000/api/v1/system/health
```

Response:

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "subsystems": {
      "config": { "status": "healthy", "message": "Configuration loaded" },
      "database": { "status": "healthy", "message": "Database connected" },
      ...
    }
  }
}
```

---

## REST API

The API runs on localhost only (bound to `127.0.0.1`). All endpoints are prefixed with `/api/v1`.

| Method | Path | Description |
|---|---|---|
| `GET` | `/system/health` | Health check |
| `GET` | `/modules` | List all module manifests |
| `GET` | `/modules/:id` | Single module manifest |
| `GET` | `/modules/:id/settings` | Module settings metadata |
| `GET` | `/guilds/:guildId/modules` | Modules for a guild |
| `GET` | `/guilds/:guildId/settings` | All setting values for a guild |
| `PATCH` | `/guilds/:guildId/settings` | Update setting values |

Settings are stored per-guild in PostgreSQL. The `PATCH` endpoint validates values against registered Zod schemas before persisting. When a setting is changed, the `ConfigurationService` updates the in-memory runtime snapshot and emits a `configuration.changed` event — modules that read live config (Welcome, Goodbye) pick up the new value without restart.

---

## Dashboard

Status: **Implemented, not deployed.**

The dashboard platform is a complete React application built with Vite, Tailwind CSS 4, and Vitest. It provides:

- Module homepage with cards
- Guild switcher
- Dynamic settings forms rendered from metadata (no hardcoded forms)
- Welcome and Goodbye card configuration
- Voice, Logging, Moderation, General module settings
- Theme persistence (localStorage)
- Responsive layout

### Current status by feature

| Feature | Status |
|---|---|
| Platform shell | Complete |
| Dynamic settings rendering | Complete |
| Backend API integration | Complete |
| Welcome/Goodbye card config | Complete |
| Theme persistence | Complete |
| Discord OAuth | **Not implemented** |
| Public deployment | **Blocked** (requires OAuth) |
| Nginx reverse proxy | Not configured |

### Development

For dashboard development, run the bot API and dashboard dev server simultaneously:

```bash
# Terminal 1: start the bot
npm run dev

# Terminal 2: start the dashboard dev server
npm run dashboard:dev
```

Create `dashboard/.env.local` with:

```env
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_GUILD_ID=<your-guild-id>
```

### Production

The dashboard is **not deployed** in production. The Vite build (`dist-dashboard/`) is generated as part of `npm run build` but no web server is configured to serve it. The built files are static and could be served behind nginx once OAuth is implemented.

---

## Testing

| Command | Description |
|---|---|
| `npm run typecheck` | Type-check backend and dashboard (0 errors enforced) |
| `npm run lint` | Lint backend and dashboard with ESLint |
| `npm run test` | Run all backend tests + dashboard tests |
| `npm run test:coverage` | Backend tests with coverage report |
| `npm run dashboard:test` | Dashboard component tests only |

Current test suite: **490 tests** (472 backend + 18 dashboard), all passing.

---

## Production Deployment

### 1. Build

```bash
npm run build
```

Compiles TypeScript to `dist/` and builds the dashboard to `dist-dashboard/`.

### 2. Migration

```bash
npm run migrate
```

Creates the `guild_settings` and `warnings` tables. Run once before starting the bot.

### 3. PM2

```bash
pm2 start ecosystem.config.js --env production
```

The PM2 config (`ecosystem.config.js`) is pre-configured with:

- `max_memory_restart: 512M`
- `max_restarts: 10`, `restart_delay: 5000`
- `kill_timeout: 15000`
- `wait_ready: true`, `listen_timeout: 20000`
- Log files in `logs/`
- `exec_mode: fork` (single instance, the bot maintains its own state)

### 4. Health monitoring

```bash
# Manual check
curl http://127.0.0.1:3000/api/v1/system/health

# Watch logs
pm2 logs hoakbot

# View metrics snapshot (included in health endpoint)
```

### 5. Backup

```bash
pg_dump "$DATABASE_URL" > hoakbot-backup-$(date +%Y%m%d).sql
```

Back up the `.env` file separately — it is not stored in the repository.

---

## npm Scripts

| Command | Description |
|---|---|
| `npm run build` | Compile TypeScript + build dashboard |
| `npm start` | Run the compiled bot |
| `npm run dev` | Start with tsx watch for auto-reload |
| `npm run lint` | Lint with ESLint |
| `npm run lint:fix` | Lint and auto-fix |
| `npm run format` | Format with Prettier |
| `npm run format:check` | Check formatting |
| `npm run typecheck` | Type-check without emitting |
| `npm run test` | Run all tests |
| `npm run migrate` | Run database migrations |
| `npm run deploy:commands` | Register slash commands with Discord |
| `npm run list:commands` | List registered commands |
| `npm run clear:global-commands` | Remove all global commands |
| `npm run dashboard:dev` | Dashboard development server |
| `npm run dashboard:build` | Build dashboard for production |
| `npm run dashboard:test` | Dashboard component tests |

---

## Contributing

1. Fork the repository.
2. Create a feature branch.
3. Make your changes. Keep modules self-contained under `src/modules/<name>/`.
4. Run `npm run lint`, `npm run typecheck`, and `npm run test` before committing.
5. Open a pull request.

---

## Version History

| Version | Highlights |
|---|---|
| v1 | Initial bot with prefix commands, voice automation, basic moderation |
| v2 | Modular architecture, logging module, welcome/goodbye cards, 338 tests, CI/CD |
| v3 | ConfigurationService, DatabaseConfigProvider, REST API, settings platform, live config, dashboard, bounded cache, crash handlers, 490 tests |

---

## Roadmap

See [ROADMAP.md](ROADMAP.md) for future plans.

---

## License

MIT

---

Hoak Bot is a personal project for managing a private Discord community. It is not a general-purpose bot framework, but its modular architecture and clean separation of concerns make it a useful reference for anyone building a TypeScript Discord bot.
