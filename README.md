# Hoak Bot

[![Build](https://img.shields.io/github/actions/workflow/status/erastushs/hoakbot/deploy.yml?branch=main&label=build)](https://github.com/erastushs/hoakbot/actions/workflows/deploy.yml)
[![Tests](https://img.shields.io/github/actions/workflow/status/erastushs/hoakbot/release.yml?label=tests)](https://github.com/erastushs/hoakbot/actions/workflows/release.yml)
[![Version](https://img.shields.io/github/package-json/v/erastushs/hoakbot)](https://github.com/erastushs/hoakbot)
[![Node.js](https://img.shields.io/badge/node-%3E%3D22-339933?logo=node.js)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Discord.js](https://img.shields.io/badge/discord.js-v14-5865F2?logo=discord)](https://discord.js.org)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

A modular Discord bot built for a private Discord server. Handles general interactions and voice channel automation with clean architecture, structured logging, and health monitoring. Written in TypeScript on Discord.js v14 with PostgreSQL persistence and PM2 process management. Deployed automatically via GitHub Actions.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 22 |
| Language | TypeScript 5.9 |
| Discord | discord.js v14, @discordjs/voice |
| Database | PostgreSQL (postgres) |
| Validation | Zod |
| Logging | Pino |
| Process | PM2 |
| CI/CD | GitHub Actions |

---

## Features

### General

- Slash commands (`/ping`, `/help`)
- Case-insensitive prefix commands (`hoakping`, `hoakhelp`, `hoakp`)
- Shared command registry with alias support
- Combined slash and prefix dispatch layer

### Voice

- Automatically joins a configured standby voice channel on startup
- Detects when a member joins any voice channel
- Moves to the member's channel, plays a configurable sound, then returns to standby
- 6-state machine: `IDLE` → `MOVING` → `WAITING` → `PLAYING` → `RETURNING` → `COOLDOWN`
- Cooldown protection between activations
- Exponential backoff reconnection with configurable retry limit

### Logging

- Voice join/leave/move logging with embeds
- Member profile change logging (nickname, display name, avatar, roles)
- Message deletion, editing, and bulk deletion with attachment archiving
- Moderation action logging (kick, ban, timeout, warn, clean)

### Moderation

- `/kick`, `/ban`, `/timeout`, `/warn`, `/clean` commands
- Role-based permission levels (admin, moderator, trusted)
- Warning system with persistent tracking

### Welcome & Goodbye

- Custom welcome cards with configurable backgrounds and templates
- Custom goodbye cards with configurable backgrounds
- Placement variables (`{mention}`, `{server}`, `{membercount}`)

### Core

- Lightweight dependency injection container
- Internal EventBus with 22 typed events
- Runtime config validation with Zod
- Structured logging via Pino
- PostgreSQL adapter with connection pooling (Supabase)
- Subsystem health checks with startup summary
- In-process metrics (counters, gauges, timers)
- Module-based architecture with feature flags

---

## Project Structure

```
src/
  adapters/              Discord client factory, command router
  core/                  Infrastructure
    config/              ConfigService, Zod schemas, types
    container/           Lightweight DI container
    database/            PostgreSQL adapter
    errors/              Typed error classes
    event-bus/           Internal EventBus with 22 typed events
    health/              HealthService and check registry
    logger/              Pino logger factory
    metrics/             Counters, gauges, timers
    permissions/         Role-based permission levels
    feature-flags/       Module toggle types
  modules/
    general/             /ping, /help commands
    voice/               Voice follow-and-play with state machine
    logging/             Member, voice, message, moderation logging
    moderation/          Kick, ban, timeout, warn, clean commands
    welcome/             Welcome card generation
    goodbye/             Goodbye card generation
    metrics/             Health check and metrics commands
  shared/                Builders, constants, types, command registry

config/                  bot.json, permissions.json, feature-flags.json
assets/
  sounds/                hoak.mp3
  images/                Welcome and goodbye backgrounds
scripts/                 deploy-commands, list-commands, clear-global-commands
tests/                   Unit tests (338 tests, Vitest)
.github/workflows/       CI/CD deploy and release pipelines
```

---

## Getting Started

### Prerequisites

- Node.js 22+
- npm
- A Discord Bot Application with token
- PostgreSQL (local or Supabase)

### Installation

```bash
git clone https://github.com/erastus-hs/hoakbot.git
cd hoakbot
npm install
```

### Configuration

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env` with your secrets, then edit `config/bot.json` to set the prefix, voice channel, and other runtime settings.

### Build & Start

```bash
npm run build
npm start
```

For development with auto-reload:

```bash
npm run dev
```

### Backend API

The backend API runs in the bot process.

- Listening port: `API_PORT`, default `3000`
- Startup command: `npm run dev` for development, or `npm run build && npm start` for production
- Health endpoint: `GET http://localhost:3000/api/v1/system/health`

### Dashboard Development

Create `dashboard/.env.local` from `dashboard/.env.example`:

```bash
cp dashboard/.env.example dashboard/.env.local
```

Required dashboard development variables:

```bash
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_GUILD_ID=504841992900182027
```

When `VITE_API_BASE_URL` is omitted, the dashboard defaults to `/api/v1`. In Vite development, `/api` is proxied to `http://localhost:3000`.

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `BOT_TOKEN` | Yes | – | Discord bot token |
| `CLIENT_ID` | Yes | – | Discord application client ID |
| `DATABASE_URL` | Yes | – | PostgreSQL connection string |
| `API_PORT` | No | `3000` | Backend API HTTP port |
| `GUILD_ID` | No | – | Primary guild ID (overrides `bot.json`) |
| `OWNER_IDS` | No | – | Comma-separated owner IDs (overrides `bot.json`) |
| `NODE_ENV` | No | `production` | `development` or `production` |
| `LOG_LEVEL` | No | `info` | `trace`, `debug`, `info`, `warn`, `error`, `fatal` |

The `DATABASE_URL` expects a full PostgreSQL connection string:

```
postgresql://user:password@host:port/database
```

---

## Configuration Files

Secrets live in `.env`. All other runtime configuration lives in `config/` as JSON:

| File | Purpose |
|---|---|
| `bot.json` | Prefix, presence, cooldowns, voice, logging, welcome, goodbye |
| `permissions.json` | Role mappings for admin, moderator, trusted |
| `feature-flags.json` | Module toggles (`true` / `false`) |

---

## Commands

| Prefix | Slash | Description |
|---|---|---|
| `hoakping` | `/ping` | Bot latency check |
| `hoakhelp` | `/help` | Command list |
| `hoakkick` | `/kick` | Kick a member |
| `hoakban` | `/ban` | Ban a member |
| `hoaktimeout` | `/timeout` | Timeout a member |
| `hoakwarn` | `/warn` | Issue a warning |
| `hoakclean` | `/clean` | Bulk delete messages |

---

## npm Scripts

| Command | Description |
|---|---|
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled bot |
| `npm run dev` | Start with tsx watch for auto-reload |
| `npm run lint` | Lint with ESLint |
| `npm run lint:fix` | Lint and auto-fix |
| `npm run format` | Format with Prettier |
| `npm run format:check` | Check formatting |
| `npm run typecheck` | Type-check without emitting |
| `npm run deploy:commands` | Register slash commands with Discord |
| `npm run list:commands` | List registered global and guild commands |
| `npm run clear:global-commands` | Remove all global commands |

---

## Deployment

The bot deploys automatically on push to `main`:

1. GitHub Actions builds the project (`npm ci` + `npm run build`)
2. SSH into the VPS runs `~/deploy-hoakbot.sh`
3. PM2 reloads the process with zero downtime

Required GitHub Actions secrets: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`.

---

## Roadmap

### v2.0 — Stable (Current)

- Modular architecture with 8 feature modules
- Logging module (voice, member, message, moderation)
- Welcome and goodbye card system
- Moderation commands (kick, ban, timeout, warn, clean)
- Shared build infrastructure (EmbedFactory, COLORS, Errors, Response)
- Feature flags for module toggling
- Comprehensive test suite (338 tests)
- CI/CD pipeline with automated deploy

### v3.0 — Dashboard & Configuration Platform (Next)

See [ROADMAP.md](ROADMAP.md) for the full v3.0 plan.

**Phase 1** — ConfigProvider abstraction layer (replace direct `bot.json` access)
**Phase 2** — Database configuration (guild_settings, logging_settings, etc.)
**Phase 3** — Configuration cache (in-memory with Redis-ready design)
**Phase 4** — Dashboard REST API (Discord OAuth2, guild-scoped endpoints)
**Phase 5** — Dashboard frontend (Next.js, Tailwind, dark mode)
**Phase 6** — Settings framework (metadata-driven, reusable form system)
**Phase 7** — Feature pages (Voice, Welcome, Goodbye, Logging, Moderation, General)
**Phase 8** — Live configuration (no-restart settings updates)
**Phase 9** — Plugin-ready architecture (auto-registering modules)
**Phase 10** — Dashboard polish (audit log, search, pagination, backup/restore)

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `npm run lint` and `npm run typecheck`
5. Open a pull request

Keep modules self-contained under `src/modules/<name>/`. Each module implements the `IModule` interface and registers its commands, services, and event handlers in the `register()` method.

---

## License

MIT

---

Hoak Bot is a personal project built for learning, experimentation, and managing a private Discord community. It is not intended as a general-purpose bot framework, but its modular architecture and clean separation of concerns make it a useful reference for anyone building a TypeScript Discord bot.
