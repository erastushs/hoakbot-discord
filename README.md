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
- 5-state machine: `IDLE` → `MOVING` → `PLAYING` → `RETURNING` → `COOLDOWN`
- Cooldown protection between activations
- Exponential backoff reconnection with configurable retry limit

### Core

- Lightweight dependency injection container
- Internal Event Bus (17 typed events)
- Runtime config validation with Zod
- Structured logging via Pino (pretty-printed in dev, NDJSON in production)
- PostgreSQL adapter with connection pooling
- Subsystem health checks with startup summary table
- In-process metrics (counters, gauges, timers)
- Module-based architecture with feature flags

---

## Project Structure

```
src/
  adapters/           Discord client factory, command router
  core/               Infrastructure
    config/           ConfigService, Zod schemas, types
    container/        Lightweight DI container
    database/         PostgreSQL adapter
    errors/           Typed error classes
    event-bus/        Internal EventBus with typed events
    health/           HealthService and check registry
    logger/           Pino logger factory
    metrics/          Counters, gauges, timers
    permissions/      Role definitions (stub)
    scheduler/        Cron/job types (stub)
    feature-flags/    Module toggle types (stub)
  modules/
    general/          /ping, /help commands
    voice/            Voice channel follow-and-play logic
    moderation/       Placeholder (not yet implemented)
  shared/             Command registry, types, middleware (stub)

config/               bot.json, permissions.json, feature-flags.json
assets/
  sounds/             hoak.mp3
scripts/              deploy-commands, list-commands, clear-global-commands
.github/workflows/    CI/CD deploy pipeline
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

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `BOT_TOKEN` | Yes | – | Discord bot token |
| `CLIENT_ID` | Yes | – | Discord application client ID |
| `DATABASE_URL` | Yes | – | PostgreSQL connection string |
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
| `bot.json` | Prefix, presence, cooldowns, voice settings |
| `permissions.json` | Role mappings for admin, moderator, trusted |
| `feature-flags.json` | Module toggles (`true` / `false`) |

---

## Commands

| Prefix | Slash | Alias | Description |
|---|---|---|---|
| `hoakping` | `/ping` | `hoakp` | Replies with bot latency |
| `hoakhelp` | `/help` | – | Lists all available commands |

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

### Completed

- Dual slash and prefix command system
- Shared command registry with alias support
- Voice follow-and-play with state machine
- DI container, EventBus, health checks, metrics
- Config validation with Zod
- Structured logging with Pino
- PostgreSQL adapter with connection pooling
- GitHub Actions CI/CD pipeline
- PM2 production process management

### In Progress

- Database schema and repository layer
- Permission middleware

### Planned

- `avatar`, `userinfo`, `serverinfo`, `botinfo` commands
- Moderation commands (kick, ban, timeout, warn, purge)
- Multiple configurable sounds with a sound library
- Custom per-user sound triggers
- Usage statistics and dashboard
- Cache layer (in-memory)
- Scheduler (cron jobs, reminders)
- Internationalization support

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
