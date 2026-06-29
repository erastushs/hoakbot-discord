# Hoak Bot — System Architecture & Development Roadmap

**Version:** 3.0 — Final Pre-Implementation Blueprint
**Target Platform:** Ubuntu VPS + Node.js 22 LTS + PM2
**Community:** Hoak Family Discord (1 server, < 50 members)
**Database:** Supabase PostgreSQL
**Architecture Style:** Module-Based Discord Bot

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [System Architecture Overview](#2-system-architecture-overview)
3. [Development Roadmap](#3-development-roadmap)
4. [Project Structure](#4-project-structure)
5. [Core Infrastructure](#5-core-infrastructure)
6. [Module System](#6-module-system)
7. [Dependency Injection](#7-dependency-injection)
8. [Internal Event Bus](#8-internal-event-bus)
9. [Database Design](#9-database-design)
10. [Configuration System](#10-configuration-system)
11. [Command System](#11-command-system)
12. [Voice System](#12-voice-system)
13. [Voice Architecture](#13-voice-architecture)
14. [Cache Layer](#14-cache-layer)
15. [Scheduler](#15-scheduler)
16. [Metrics Service](#16-metrics-service)
17. [Health Service](#17-health-service)
18. [Feature Flags](#18-feature-flags)
19. [Logging System](#19-logging-system)
20. [Permission System](#20-permission-system)
21. [Event System](#21-event-system)
22. [PM2 Deployment](#22-pm2-deployment)
23. [Future Expansion](#23-future-expansion)
24. [Documentation Structure](#24-documentation-structure)
25. [Dependency Planning](#25-dependency-planning)
26. [Architectural Principles](#26-architectural-principles)

---

## 1. Design Philosophy

Hoak Bot is a personal Discord bot built for the **Hoak Family** community — a single server of under 50 members, running on one VPS, maintained by one developer.

### Scope

| Aspect | Reality |
|---|---|
| **Servers** | 1 guild |
| **Members** | < 50 |
| **Developers** | 1 |
| **Deployment** | Single Ubuntu VPS via PM2 |
| **Database** | Supabase PostgreSQL |
| **HA / Clustering** | Not needed |
| **Microservices** | Not needed |

### Core Tenets

| Tenet | Meaning |
|---|---|
| **Module-Based** | Every feature is a self-contained module owning its own commands, events, services, repositories, types, and configuration |
| **Infrastructure-First** | Core infrastructure (DI, Event Bus, Logger, Database, Scheduler, Metrics, Health) is built before any business feature |
| **Zero Direct Coupling** | Modules never import from each other. All inter-module communication flows through the Internal Event Bus |
| **Data-Driven** | Behavior is driven by configuration and database records, not hardcoded logic |
| **Readability Over Optimization** | Code is written for maintainability first. Single-server scale — advanced optimization is unnecessary |
| **Keep It Simple** | Architecture exists to organize code, not to demonstrate patterns. No unnecessary abstractions |

### Architecture Diagram

```
┌──────────────────────────────────────────────────────────┐
│                     Hoak Bot                              │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │              Discord Adapter Layer               │   │
│  │  (Event translators, Command router)              │   │
│  └───────────────────────┬──────────────────────────┘   │
│                          │                               │
│                          ▼                               │
│  ┌──────────────────────────────────────────────────┐   │
│  │              Internal Event Bus                  │   │
│  └────┬──────────┬──────────┬──────────┬────────────┘   │
│       │          │          │          │                 │
│       ▼          ▼          ▼          ▼                 │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────────┐            │
│  │Voice │  │ Mod  │  │General│ │ Metrics  │            │
│  │Module│  │Module│  │Module │ │  Module  │            │
│  └──────┘  └──────┘  └──────┘  └──────────┘            │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │               Core Infrastructure                │   │
│  │  DI Container │ Logger │ Database │ Scheduler    │   │
│  └──────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

---

## 2. System Architecture Overview

### High-Level Component Diagram

```
                          ┌────────────────────┐
                          │   Discord Gateway   │
                          └──────────┬─────────┘
                                     │
                          ┌──────────▼─────────┐
                          │  Discord Adapters   │
                          │  (Event + Command   │
                          │   Translators)      │
                          └──────────┬─────────┘
                                     │
                          ┌──────────▼─────────┐
                          │   Command Router    │
                          │  (Slash + Prefix)   │
                          └──────────┬─────────┘
                                     │
          ┌──────────────────────────┼──────────────────────────┐
          │                          │                          │
          ▼                          ▼                          ▼
   ┌─────────────┐          ┌─────────────┐          ┌─────────────┐
   │  Middleware  │          │  Middleware  │          │  Middleware  │
   │  Cooldown    │─────────►│  Permission  │─────────►│  Logging     │
   └─────────────┘          └─────────────┘          └─────────────┘
                                     │
                                     ▼
                          ┌─────────────────────┐
                          │  Command Executor    │
                          │  (Module-delegated)  │
                          └──────────┬──────────┘
                                     │
                                     ▼
                          ┌─────────────────────┐
                          │  Internal Event Bus  │
                          └──────┬──────┬───────┘
                                 │      │
                    ┌────────────┘      └────────────┐
                    ▼                                ▼
          ┌──────────────────┐            ┌──────────────────┐
          │   Voice Module   │            │  Metrics Module  │
          │                  │            │                  │
          │  ┌──────────┐   │            │  Increment cmd   │
          │  │Play Sound│   │            │  counter          │
          │  └──────────┘   │            └──────────────────┘
          └──────────────────┘
```

### Layer Descriptions

| Layer | Contents | Dependency Direction |
|---|---|---|
| **Interface Adapters** | Discord event listeners, command routers, slash command deployer | Depends on Core + Modules |
| **Command Pipeline** | Middleware chain (cooldown, permission, logging), shared executor | Depends on Core |
| **Internal Event Bus** | Pub/sub message broker for inter-module communication | Depends on nothing (core primitive) |
| **Modules** | Self-contained feature units (Voice, Moderation, General, etc.) | Depends on Core interfaces |
| **Core Infrastructure** | DI container, database adapter, cache, logger, scheduler, metrics, health, permissions, feature flags, error handler | Depends on nothing external |
| **Shared** | Common types, utilities, constants | Depends on nothing external |

---

## 3. Development Roadmap

### Phase 0 — Project Scaffolding

**Goal:** Repository initialization, tooling setup, environment configuration.

| Aspect | Detail |
|---|---|
| **Features** | Initialize npm project, configure TypeScript, ESLint, Prettier, `.env.example`, PM2 ecosystem file, `.gitignore`, GitHub repository setup |
| **Dependencies** | Node.js 22, TypeScript, ESLint, Prettier |
| **Complexity** | Low |
| **Effort** | 1 day |

**Acceptance Criteria:**
- `npm run build` compiles TypeScript without errors.
- `npm run lint` passes on all staged files.
- `.env.example` lists every required variable with defaults.
- PM2 configuration file exists and validates.
- Directory skeleton from §4 exists.

---

### Phase 0.5 — Core Infrastructure

**Goal:** Build the entire core infrastructure layer before writing any business feature.

| Aspect | Detail |
|---|---|
| **Features** | Config Service, Logger, DI Container, Module Loader, Internal Event Bus, Database Adapter (Supabase PostgreSQL), Repository base, Cache interface (Memory provider), Scheduler framework, Health Service, Metrics Service |
| **Dependencies** | postgres, pino, pino-pretty, pino-roll, zod, dotenv, ms |
| **Complexity** | High |
| **Effort** | 4–5 days |

**Acceptance Criteria:**
- Config Service loads and validates all config files + `.env`, freezes result.
- Logger provides `child()` loggers with structured context.
- DI Container resolves all core services and injects them.
- Module Loader discovers modules via filesystem scan, respects feature flags.
- Event Bus delivers typed events between modules.
- Database Adapter connects to Supabase, runs migrations, exposes repository interfaces.
- Cache Provider stores/retrieves entries; MemoryCacheProvider is default.
- Scheduler supports `scheduleAt()` and `scheduleInterval()`.
- Metrics Service exposes counters and gauges.
- Health Service reports status of all subsystems.
- Feature Flags gate module registration; disabled modules produce zero side effects.
- Application starts, passes health check, and shuts down gracefully on SIGTERM.

---

### Phase 1 — General Module

**Goal:** First real module goes live. Discord adapter layer connects gateway events to internal Event Bus. Commands work via both slash and prefix.

| Aspect | Detail |
|---|---|
| **Features** | Discord client bootstrap, Ready event adapter, CommandRouter (slash + prefix), shared CommandContext, middleware pipeline (cooldown, permission, logging), General Module commands: Ping, Help, Avatar, User Info, Server Info, Bot Info |
| **Dependencies** | discord.js, @discordjs/rest, @discordjs/collection |
| **Complexity** | Medium |
| **Effort** | 3–4 days |

**Acceptance Criteria:**
- Bot connects to Discord gateway and logs ready event.
- Discord events (interactionCreate, messageCreate, voiceStateUpdate, guildMemberAdd, guildMemberRemove, ready, error, disconnect) are adapted into internal events and published to Event Bus.
- All General Module commands respond correctly via both slash and prefix invocation.
- `hoakping`, `HOAKPING`, `HoakPing` all trigger the same command handler.
- Cooldowns enforced globally and per-command.
- Permission guard rejects unauthorized users.
- Console and file logging operational with rotation.

---

### Phase 2 — Voice Module

**Goal:** The signature feature. Bot idle-joins a standby channel, follows members into voice channels, plays audio, and returns. Entirely data-driven via the `audio_library` table.

| Aspect | Detail |
|---|---|
| **Features** | VoiceManager, AudioManager, ConnectionManager, QueueManager, StateManager, standby channel join, voice join detection, audio playback (hoak.mp3), return to standby, cooldown, queue support, ignore bots/self, auto-reconnect, voice event logging via Event Bus |
| **Dependencies** | @discordjs/voice, FFmpeg, libsodium-wrappers, prism-media |
| **Complexity** | High |
| **Effort** | 5–7 days |

**Acceptance Criteria:**
- Bot joins configured standby channel on Ready event.
- When a human member joins any voice channel, bot moves to that channel.
- Plays configured audio (hoak.mp3) exactly once.
- Returns to standby channel after playback finishes.
- Ignores bots joining/leaving channels.
- Ignores its own voice state updates (no infinite loops).
- Voice events emitted to Event Bus for Metrics and logging.
- Voice events logged to database and pino.
- Cooldown prevents rapid re-triggering.
- Disconnection triggers auto-reconnect to standby.
- Adding a new sound requires only an INSERT into audio_library + audio file; zero code changes.

---

### Phase 3 — Moderation Module

**Goal:** Moderation commands with centralized permission system.

| Aspect | Detail |
|---|---|
| **Features** | Kick, Ban, Timeout, Warn, Purge commands, moderation log table, moderation events published to Event Bus |
| **Dependencies** | None new |
| **Complexity** | Medium |
| **Effort** | 2–3 days |

**Acceptance Criteria:**
- All moderation commands use the centralized permission system.
- Commands reject unauthorized users before executing.
- Moderation actions stored in database with timestamps and reasons.
- Moderation events emitted to Event Bus for audit logging.
- Audit log channel receives embeds on each action.

---

### Phase 4 — Testing & Production

**Goal:** Error handling, logging improvements, PM2 deployment, production validation.

| Aspect | Detail |
|---|---|
| **Features** | Error boundaries on all event handlers and commands, graceful shutdown on SIGTERM, log rotation, health checks verified, PM2 deployment tested, production VPS validation, documentation updates |
| **Dependencies** | pino-roll |
| **Complexity** | Medium |
| **Effort** | 2–3 days |

**Acceptance Criteria:**
- Bot is stable for daily use on the production VPS.
- All event handlers wrapped in try-catch with error logging.
- Logs rotate daily, retain 14 days.
- `SIGTERM` triggers: disconnect Discord → publish shutdown event → close DB → process exit 0.
- `pm2 startup` ensures bot starts after VPS reboot.
- Health service reports accurate subsystem statuses.
- PM2 `max_memory_restart` tested and tuned.

---

### Roadmap Summary

```
Phase 0    ██████░░░░░░░░░░░░░░  Scaffolding              Day 1
Phase 0.5  ████████████░░░░░░░░  Core Infrastructure      Days 2–6
Phase 1    ██████████████████░░  General Module            Days 7–10
Phase 2    ███████████████████░  Voice Module              Days 11–17
Phase 3    ███████████████████░  Moderation Module         Days 18–20
Phase 4    ████████████████████  Testing & Production      Days 21–23
```

**Total estimated effort:** ~4 weeks.

---

## 4. Project Structure

```
hoakbot/
├── ecosystem.config.js           # PM2 production config
├── tsconfig.json                 # TypeScript configuration
├── package.json                  # Dependencies & scripts
├── .env.example                  # Environment variable template
├── .eslintrc.json                # ESLint configuration
├── .prettierrc                   # Prettier configuration
├── .gitignore
├── ARCHITECTURE.md               # This document
│
├── src/
│   ├── bootstrap.ts              # Application entry point — wires everything
│   │
│   ├── core/                     # Infrastructure only — NO business logic
│   │   ├── index.ts              # Core barrel export
│   │   │
│   │   ├── config/               # Configuration system
│   │   │   ├── config.service.ts # Loads, merges, validates all config
│   │   │   ├── schema.ts         # Zod validation schema for entire config
│   │   │   └── types.ts          # AppConfig type definition
│   │   │
│   │   ├── container/            # Dependency Injection
│   │   │   ├── container.ts      # DI Container implementation
│   │   │   ├── tokens.ts         # Injection token constants
│   │   │   └── types.ts          # Provider, Factory, Scope types
│   │   │
│   │   ├── event-bus/            # Internal Event Bus
│   │   │   ├── event-bus.ts      # Publish/subscribe implementation
│   │   │   ├── events.ts         # All internal event type definitions
│   │   │   └── types.ts          # IEvent, IEventHandler types
│   │   │
│   │   ├── database/             # Database adapter layer
│   │   │   ├── database-adapter.ts   # IDatabaseAdapter interface
│   │   │   ├── supabase.adapter.ts   # Supabase PostgreSQL implementation
│   │   │   ├── migrations/           # Migration scripts (numbered)
│   │   │   │   ├── 001_initial.ts
│   │   │   │   └── runner.ts         # Migration execution engine
│   │   │   ├── repositories/         # Repository implementations
│   │   │   │   ├── guild.repository.ts
│   │   │   │   ├── user.repository.ts
│   │   │   │   ├── moderation.repository.ts
│   │   │   │   ├── voice.repository.ts
│   │   │   │   ├── audio-library.repository.ts
│   │   │   │   ├── scheduled-jobs.repository.ts
│   │   │   │   └── audit.repository.ts
│   │   │   └── types.ts              # Repository interfaces
│   │   │
│   │   ├── cache/                 # Cache abstraction
│   │   │   ├── cache-provider.ts  # ICacheProvider interface
│   │   │   ├── memory-cache.ts    # In-memory implementation
│   │   │   └── types.ts
│   │   │
│   │   ├── logger/                # Logging service
│   │   │   ├── logger.service.ts  # Pino-based logger
│   │   │   └── types.ts           # Logger context types
│   │   │
│   │   ├── scheduler/             # Task scheduler
│   │   │   ├── scheduler.service.ts
│   │   │   └── types.ts
│   │   │
│   │   ├── metrics/               # Metrics service
│   │   │   ├── metrics.service.ts # Counter, Gauge, Histogram
│   │   │   └── types.ts
│   │   │
│   │   ├── health/                # Health check service
│   │   │   ├── health.service.ts  # Aggregate subsystem health
│   │   │   └── types.ts
│   │   │
│   │   ├── permissions/           # Permission guard
│   │   │   ├── permission.service.ts
│   │   │   └── types.ts
│   │   │
│   │   ├── feature-flags/         # Feature toggle system
│   │   │   ├── feature-flags.service.ts
│   │   │   └── types.ts
│   │   │
│   │   └── errors/                # Error boundary + error types
│   │       ├── error-handler.ts   # Global error boundary
│   │       └── types.ts           # AppError, ErrorCode
│   │
│   ├── modules/                   # Feature modules
│   │   ├── module.interface.ts    # IModule interface
│   │   ├── module-loader.ts       # Discovers + loads modules
│   │   │
│   │   ├── general/              # General commands module
│   │   │   ├── general.module.ts  # Module registration
│   │   │   ├── commands/
│   │   │   │   ├── ping.command.ts
│   │   │   │   ├── help.command.ts
│   │   │   │   ├── avatar.command.ts
│   │   │   │   └── serverinfo.command.ts
│   │   │   ├── events/
│   │   │   │   └── (none initially)
│   │   │   ├── services/
│   │   │   ├── repositories/
│   │   │   └── types.ts
│   │   │
│   │   ├── voice/                # Voice module
│   │   │   ├── voice.module.ts
│   │   │   ├── commands/
│   │   │   │   └── voice-config.command.ts
│   │   │   ├── events/
│   │   │   │   └── voice-state.handler.ts
│   │   │   ├── services/
│   │   │   │   ├── VoiceManager.ts
│   │   │   │   ├── AudioManager.ts
│   │   │   │   ├── ConnectionManager.ts
│   │   │   │   ├── QueueManager.ts
│   │   │   │   └── StateManager.ts
│   │   │   ├── repositories/
│   │   │   │   └── audio-library.repository.ts
│   │   │   └── types.ts
│   │   │
│   │   ├── moderation/           # Moderation module
│   │   │   ├── moderation.module.ts
│   │   │   ├── commands/
│   │   │   │   ├── warn.command.ts
│   │   │   │   ├── kick.command.ts
│   │   │   │   └── ban.command.ts
│   │   │   ├── events/
│   │   │   ├── services/
│   │   │   │   └── moderation.service.ts
│   │   │   ├── repositories/
│   │   │   └── types.ts
│   │   │
│   │   ├── metrics/              # Metrics module (exposes metrics)
│   │   │   ├── metrics.module.ts
│   │   │   ├── commands/
│   │   │   │   └── stats.command.ts
│   │   │   ├── events/
│   │   │   │   └── metric-collector.handler.ts
│   │   │   └── types.ts
│   │   │
│   │   └── _template/            # Template for new modules
│   │       ├── __module.module.ts
│   │       ├── commands/
│   │       ├── events/
│   │       ├── services/
│   │       ├── repositories/
│   │       └── types.ts
│   │
│   ├── shared/                    # Shared across modules
│   │   ├── types/
│   │   │   ├── discord.ts         # Discord-specific type extensions
│   │   │   ├── command.ts         # Command option types, ICommand, CommandContext
│   │   │   └── common.ts          # GuildId, UserId, Snowflake brand types
│   │   ├── utils/
│   │   │   ├── embeds.ts          # Embed builders (success, error, info)
│   │   │   ├── cooldown.ts        # Cooldown map manager
│   │   │   ├── formatters.ts      # Duration, bytes, etc.
│   │   │   ├── constants.ts       # Magic strings/numbers
│   │   │   └── guards.ts          # Type guard utilities
│   │   └── middleware/
│   │       ├── cooldown.middleware.ts
│   │       ├── permission.middleware.ts
│   │       └── logging.middleware.ts
│   │
│   └── adapters/                  # Discord-specific adapters
│       ├── discord-client.ts      # Client factory
│       ├── event-adapters/        # Discord events → internal events
│       │   ├── ready.adapter.ts
│       │   ├── interaction-create.adapter.ts
│       │   ├── message-create.adapter.ts
│       │   ├── voice-state-update.adapter.ts
│       │   ├── guild-member-add.adapter.ts
│       │   └── guild-member-remove.adapter.ts
│       └── command-router.ts      # Routes slash + prefix to module commands
│
├── config/                        # Configuration files
│   ├── bot.json
│   ├── permissions.json
│   └── feature-flags.json
│
├── assets/                        # Static assets
│   └── sounds/                    # Audio files
│       └── hoak.mp3
│
├── logs/                          # Production log output (gitignored)
│   └── .gitkeep
│
├── docs/                          # Documentation
│   ├── architecture/
│   │   └── adr/                   # Architecture Decision Records
│   │       ├── 001-di-container.md
│   │       ├── 002-event-bus.md
│   │       ├── 003-module-loader.md
│   │       └── 004-database-adapter.md
│   ├── database/
│   │   └── schema.md
│   ├── deployment/
│   │   └── pm2.md
│   ├── modules/
│   │   ├── module-guide.md
│   │   ├── general.md
│   │   ├── voice.md
│   │   └── moderation.md
│   ├── roadmap/
│   │   └── phases.md
│   └── api/
│       └── event-catalog.md
│
└── scripts/                       # Build & utility scripts
    ├── deploy-commands.ts         # Slash command deployer
    └── migrate.ts                 # Database migration runner
```

### Module Isolation Contract

Every module directory contains ONLY files related to that module. No module imports from another module's directory. Cross-module communication is exclusively via Event Bus. Core infrastructure is injected via DI.

```
Module A ──(Event Bus)──► Module B
Module A ──(DI)──────────► Core Services
Module A ──(import)──────► shared/
Module A ──✕──────────────► Module B directory
```

---

## 5. Core Infrastructure

### 5.1 DI Container

A lightweight, decorator-free IoC container. Services register with factory functions and injection tokens. The container resolves dependency graphs on startup.

```typescript
interface IContainer {
  register<T>(token: InjectionToken<T>, factory: Factory<T>): void;
  registerSingleton<T>(token: InjectionToken<T>, factory: Factory<T>): void;
  resolve<T>(token: InjectionToken<T>): T;
}
```

Services declare their dependencies as constructor parameters. The container resolves and injects them:

```typescript
class VoiceManager {
  constructor(
    private readonly connectionManager: ConnectionManager,
    private readonly audioManager: AudioManager,
    private readonly queueManager: QueueManager,
    private readonly stateManager: StateManager,
    private readonly eventBus: IEventBus,
    private readonly logger: ILogger,
  ) {}
}
```

- **NO** `new Foo()` inside service constructors.
- **NO** global singletons accessed via imports.
- All services provided by the container.
- Modules receive their dependencies through `IModule.register(container)`.

### 5.2 Module Loader

Scans `src/modules/` directory at startup. Each subdirectory with a `*.module.ts` file is a module. The loader:

1. Reads `feature-flags.json` — skips disabled modules.
2. Imports the module's default export (must implement `IModule`).
3. Calls `module.register(container)` — module registers its commands, events, services.
4. Calls `module.onStart?()` for async initialization.

Adding a new module: create directory + module file. The loader discovers it automatically. No manual registration in bootstrap code.

```typescript
interface IModule {
  readonly name: string;
  readonly version: string;
  readonly enabled: boolean;
  register(container: IContainer): void;
  onStart?(): Promise<void>;
  onShutdown?(): Promise<void>;
}
```

### 5.3 Error Handler

A centralized error boundary wraps all event handlers, command executions, and module lifecycle hooks:

```typescript
class ErrorHandler {
  handle(error: Error, context: ErrorContext): void {
    logger.error({ error, ...context });
    metrics.incrementCounter('errors', { type: error.type });
  }
}
```

- Unhandled promise rejections and uncaught exceptions are caught at process level.
- Errors in one module's event handler do not crash the Event Bus or other modules.

### 5.4 Shutdown Lifecycle

```
SIGTERM / SIGINT received
  │
  ▼
Set isShuttingDown = true
  │
  ▼
Disconnect Discord client
  │
  ▼
Publish ShutdownEvent to Event Bus
  │
  ▼
Call module.onShutdown() for each module (reverse registration order)
  │
  ▼
Close database connections
  │
  ▼
Close cache connections
  │
  ▼
Flush logs
  │
  ▼
process.exit(0)
```

### 5.5 Configuration Service

See [§10 Configuration System](#10-configuration-system) for full details. The Config Service lives in `core/config/` and is one of the first services registered in the container.

### 5.6 Logger Service

See [§19 Logging System](#19-logging-system) for full details. The Logger Service lives in `core/logger/` and provides child loggers with injected context.

---

## 6. Module System

### Module Lifecycle

```
Application Bootstrap
  │
  ▼
Container registers all Core services
  │
  ▼
ModuleLoader scans src/modules/
  │
  ▼
FeatureFlags service filters enabled modules
  │
  ▼
For each enabled module:
  ├── import module class
  ├── module.register(container)
  │     ├── Register commands → CommandRegistry
  │     ├── Register event handlers → EventBus
  │     ├── Register services → Container
  │     └── Register repositories → Container
  └── module.onStart()
        └── (e.g., VoiceModule joins standby channel)
```

### Module-to-Module Communication

Modules communicate exclusively through the Event Bus:

```
VoiceModule detects voiceStateUpdate
  │
  ▼
VoiceModule publishes VoiceSoundPlayedEvent
  │
  ├──► MetricsModule: increments voice_counter
  ├──► AuditModule: writes to audit_logs table
  └──► [Future] DashboardModule: pushes via WebSocket
```

No direct import of one module's services from another module.

### Creating a New Module

1. Copy `src/modules/_template/`.
2. Rename directory and module class.
3. Add entry to `config/feature-flags.json`.
4. Implement `register(container)` — register commands and event handlers.
5. Module is auto-discovered on next startup.

---

## 7. Dependency Injection

### Container Design

Injection tokens are typed symbols, ensuring compile-time safety:

```typescript
// core/container/tokens.ts
export const TOKENS = {
  EventBus: Symbol.for('eventBus') as InjectionToken<IEventBus>,
  Logger: Symbol.for('logger') as InjectionToken<ILogger>,
  DatabaseAdapter: Symbol.for('db') as InjectionToken<IDatabaseAdapter>,
  CacheProvider: Symbol.for('cache') as InjectionToken<ICacheProvider>,
  Scheduler: Symbol.for('scheduler') as InjectionToken<IScheduler>,
  Metrics: Symbol.for('metrics') as InjectionToken<IMetrics>,
  Health: Symbol.for('health') as InjectionToken<IHealthService>,
  Config: Symbol.for('config') as InjectionToken<Readonly<AppConfig>>,
  Permissions: Symbol.for('permissions') as InjectionToken<IPermissionService>,
  FeatureFlags: Symbol.for('featureFlags') as InjectionToken<IFeatureFlags>,
  DiscordClient: Symbol.for('discordClient') as InjectionToken<Client>,
  CommandRegistry: Symbol.for('commandRegistry') as InjectionToken<ICommandRegistry>,
} as const;
```

### Wiring Diagram

```
Container
  │
  ├─ ConfigService ───────────────────────── (no deps)
  │
  ├─ LoggerService(config) ───────────────── (depends on Config)
  │
  ├─ DatabaseAdapter(config, logger) ─────── (depends on Config, Logger)
  │
  ├─ CacheProvider(config, logger) ───────── (depends on Config, Logger)
  │
  ├─ Scheduler(config, logger) ───────────── (depends on Config, Logger)
  │
  ├─ MetricsService(config, logger) ──────── (depends on Config, Logger)
  │
  ├─ HealthService(deps...) ──────────────── (depends on DB, Cache, etc.)
  │
  ├─ EventBus() ──────────────────────────── (no deps)
  │
  ├─ PermissionService(config) ───────────── (depends on Config)
  │
  ├─ FeatureFlags(config) ────────────────── (depends on Config)
  │
  ├─ DiscordClient(config, logger) ───────── (depends on Config, Logger)
  │
  └─ ModuleLoader loads modules ──────────── (depends on Container, FeatureFlags)
       │
       └─ Each module calls container.register() for its own dependencies
```

### Testing with DI

The container supports overriding registrations. In tests, replace real adapters with mocks:

```typescript
// test setup
container.register(TOKENS.DatabaseAdapter, () => mockDatabaseAdapter);
container.register(TOKENS.CacheProvider, () => mockCacheProvider);
```

No module code changes needed for testing.

---

## 8. Internal Event Bus

### Architecture

```
┌─────────────────────────────────────────────────────┐
│                    EventBus                          │
│                                                     │
│  subscribe<T>(EventType, handler) → unsubscribe()   │
│  publish<T>(EventType, payload)                      │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │ Event A  │  │ Event B  │  │ Event C  │          │
│  │Handlers  │  │Handlers  │  │Handlers  │          │
│  │ [fn,fn]  │  │ [fn]     │  │ [fn,fn]  │          │
│  └──────────┘  └──────────┘  └──────────┘          │
└─────────────────────────────────────────────────────┘
```

### Event Flow: Discord Voice Join → Multiple Modules

```
Discord Gateway: voiceStateUpdate
  │
  ▼
adapter/voice-state-update.adapter.ts
  │  Filters bots, self, no change
  │  Constructs internal VoiceMemberJoinedEvent
  │
  ▼
EventBus.publish(VoiceMemberJoinedEvent, {
  guildId, userId, channelId, timestamp
})
  │
  ├──► VoiceModule handler:
  │      Checks cooldown → moves bot → plays sound
  │      Then publishes VoiceSoundPlayedEvent
  │
  ├──► MetricsModule handler:
  │      metrics.incrementCounter('voice_triggers')
  │
  └──► AuditModule handler:
         INSERT INTO voice_events (...)
```

### Event Type Catalog (Initial Set)

| Event | Publisher | Subscribers |
|---|---|---|
| `BotReadyEvent` | Discord adapter (`ready`) | VoiceModule (join standby), MetricsModule, HealthService |
| `BotErrorEvent` | Discord adapter (`error`) | ErrorHandler, MetricsModule |
| `CommandExecutedEvent` | CommandRouter | MetricsModule, AuditModule |
| `CommandFailedEvent` | CommandRouter | ErrorHandler, MetricsModule |
| `MemberJoinedEvent` | Discord adapter | AuditModule, [future WelcomeModule] |
| `MemberLeftEvent` | Discord adapter | AuditModule, [future WelcomeModule] |
| `VoiceMemberJoinedEvent` | Discord adapter | VoiceModule, MetricsModule |
| `VoiceSoundPlayedEvent` | VoiceModule | MetricsModule, AuditModule |
| `VoiceConnectionLostEvent` | VoiceModule | HealthService, MetricsModule |
| `VoiceConnectionRestoredEvent` | VoiceModule | HealthService |
| `ModerationActionEvent` | ModerationModule | AuditModule, MetricsModule |
| `WarningIssuedEvent` | ModerationModule | AuditModule |
| `CooldownBlockedEvent` | CommandRouter | MetricsModule |
| `PermissionDeniedEvent` | PermissionMiddleware | MetricsModule |
| `SchedulerJobDueEvent` | Scheduler | Various modules |
| `ShutdownEvent` | Bootstrap | All modules (graceful shutdown) |

### Event Bus Design Principles

- **Typed payloads.** Each event has a TypeScript interface. No `any` payloads.
- **Synchronous delivery by default.** Handlers execute in the publish call stack.
- **Error isolation.** One handler throwing does not prevent other handlers from receiving the event.
- **Lazy subscription.** Modules subscribe during their `register()` phase.

---

## 9. Database Design

### Provider Architecture

```
┌──────────────────────────────────────┐
│           Business Logic              │
│  (VoiceModule, ModerationModule...)   │
└────────────────┬─────────────────────┘
                 │ depends on
                 ▼
┌──────────────────────────────────────┐
│         Repository Interface          │
│  IGuildRepository, IUserRepository... │
└────────────────┬─────────────────────┘
                 │ implemented by
                 ▼
┌──────────────────────────────────────┐
│        IDatabaseAdapter               │
│  query(), execute(), transaction()    │
└────────────────┬─────────────────────┘
                 │ implemented by
                 ▼
┌──────────────────────────────────────┐
│       SupabaseAdapter                 │
│  (PostgreSQL via pg client)           │
└────────────────┬─────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────┐
│         Supabase PostgreSQL           │
└──────────────────────────────────────┘
```

The application never directly imports the Supabase SDK outside of `core/database/supabase.adapter.ts`. All modules depend only on repository interfaces.

### Entity-Relationship Diagram

```
┌──────────────────────┐       ┌──────────────────────┐
│       guilds         │       │    guild_settings     │
├──────────────────────┤       ├──────────────────────┤
│ PK id: TEXT          │◄──┐   │ PK id: UUID           │
│    name: TEXT        │   │   │ FK guild_id: TEXT     │
│    owner_id: TEXT    │   │   │    key: TEXT          │
│    icon_hash: TEXT   │   │   │    value: JSONB       │
│    member_count: INT │   │   │    updated_at: TIMESTAMPTZ│
│    joined_at: TIMESTAMPTZ│  │   │    updated_by: TEXT │
│    created_at: TIMESTAMPTZ│  │   └──────────────────────┘
│    updated_at: TIMESTAMPTZ│  │
└──────────────────────┘   │
                           │   ┌──────────────────────┐
                           │   │     guild_roles       │
                           │   ├──────────────────────┤
                           │   │ PK id: UUID           │
                           │   │ FK guild_id: TEXT     │
                           │   │    role_id: TEXT       │
                           │   │    permission: TEXT    │
                           │   │    level: INT          │
                           │   │    created_at: TIMESTAMPTZ│
                           │   └──────────────────────┘
                           │
┌──────────────────────┐   │   ┌──────────────────────┐
│       users          │   │   │    user_profiles      │
├──────────────────────┤   │   ├──────────────────────┤
│ PK id: TEXT          │   │   │ PK id: UUID           │
│    username: TEXT    │   │   │ FK user_id: TEXT      │
│    discriminator:TEXT│   │   │ FK guild_id: TEXT     │
│    avatar_hash: TEXT │   │   │    nickname: TEXT     │
│    is_bot: BOOLEAN   │   │   │    joined_at: TIMESTAMPTZ│
│    created_at: TIMESTAMPTZ│  │   │    left_at: TIMESTAMPTZ│
│    updated_at: TIMESTAMPTZ│  │   │    created_at: TIMESTAMPTZ│
└──────────────────────┘   │   └──────────────────────┘
                           │
┌──────────────────────┐   │   ┌──────────────────────┐
│  user_statistics     │   │   │    audio_library       │
├──────────────────────┤   │   ├──────────────────────┤
│ PK id: UUID          │   │   │ PK id: UUID           │
│ FK user_id: TEXT     │   │   │ FK guild_id: TEXT     │
│ FK guild_id: TEXT    │   │   │    name: TEXT          │
│    commands_used:INT │   │   │    display_name: TEXT  │
│    voice_joins: INT  │   │   │    description: TEXT   │
│    voice_minutes:INT │   │   │    trigger: TEXT       │
│    messages_sent:INT │   │   │    file_path: TEXT     │
│    warnings: INT     │   │   │    file_size_bytes:INT │
│    last_active:TIMESTAMPTZ│  │    duration_ms: INT    │
│    created_at: TIMESTAMPTZ│  │    volume: REAL        │
│    updated_at: TIMESTAMPTZ│  │    priority: INT       │
└──────────────────────┘   │   │    cooldown_ms: INT    │
                           │   │    enabled: BOOLEAN     │
                           │   │    play_count: INT      │
                           │   │    created_at: TIMESTAMPTZ│
                           │   │    updated_at: TIMESTAMPTZ│
                           │   └──────────────────────┘
                           │
┌──────────────────────┐   │   ┌──────────────────────┐
│   voice_settings     │   │   │    voice_events        │
├──────────────────────┤   │   ├──────────────────────┤
│ PK guild_id: TEXT ◄──┼───┘   │ PK id: UUID           │
│    standby_channel:TEXT      │ FK guild_id: TEXT     │
│    enabled: BOOLEAN          │    user_id: TEXT       │
│    cooldown_ms: INT          │    event_type: TEXT    │
│    max_queue_size:INT        │    from_channel: TEXT  │
│    reconnect_delay:INT       │    to_channel: TEXT    │
│    max_reconnect: INT        │    sound_id: UUID      │
│    default_sound_id: UUID    │    metadata: JSONB     │
│    created_at: TIMESTAMPTZ   │    created_at: TIMESTAMPTZ│
│    updated_at: TIMESTAMPTZ   └──────────────────────┘
└──────────────────────┘
                           
┌──────────────────────┐   ┌──────────────────────┐
│     warnings         │   │   moderation_logs      │
├──────────────────────┤   ├──────────────────────┤
│ PK id: UUID          │   │ PK id: UUID           │
│ FK guild_id: TEXT    │   │ FK guild_id: TEXT     │
│ FK user_id: TEXT     │   │    moderator_id: TEXT  │
│    moderator_id: TEXT│   │    target_id: TEXT     │
│    reason: TEXT      │   │    action: TEXT        │
│    active: BOOLEAN   │   │    reason: TEXT        │
│    expires_at: TIMESTAMPTZ│   │    metadata: JSONB │
│    created_at: TIMESTAMPTZ│   │    created_at: TIMESTAMPTZ│
│    updated_at: TIMESTAMPTZ│   └──────────────────────┘
└──────────────────────┘
                           
┌──────────────────────┐   ┌──────────────────────┐
│   command_logs       │   │   scheduled_jobs       │
├──────────────────────┤   ├──────────────────────┤
│ PK id: UUID          │   │ PK id: UUID           │
│ FK guild_id: TEXT    │   │ FK guild_id: TEXT     │
│ FK user_id: TEXT     │   │    job_type: TEXT      │
│    command_name: TEXT│   │    job_name: TEXT      │
│    source: TEXT      │   │    payload: JSONB      │
│    options: JSONB    │   │    cron: TEXT          │
│    latency_ms: INT   │   │    execute_at: TIMESTAMPTZ│
│    success: BOOLEAN  │   │    completed: BOOLEAN  │
│    error_message:TEXT│   │    completed_at: TIMESTAMPTZ│
│    created_at: TIMESTAMPTZ│   │    failed_at: TIMESTAMPTZ│
└──────────────────────┘   │    retry_count: INT    │
                           │    max_retries: INT    │
                           │    error_message: TEXT │
                           │    created_at: TIMESTAMPTZ│
                           │    updated_at: TIMESTAMPTZ│
                           └──────────────────────┘

┌──────────────────────┐   ┌──────────────────────┐
│   feature_flags      │   │    audit_logs          │
├──────────────────────┤   ├──────────────────────┤
│ PK id: UUID          │   │ PK id: UUID           │
│    flag_key: TEXT    │   │    guild_id: TEXT      │
│    enabled: BOOLEAN  │   │    actor_id: TEXT      │
│    description: TEXT │   │    action: TEXT        │
│    module: TEXT      │   │    entity_type: TEXT   │
│    created_at: TIMESTAMPTZ│   │    entity_id: TEXT │
│    updated_at: TIMESTAMPTZ│   │    changes: JSONB  │
└──────────────────────┘   │    metadata: JSONB    │
                           │    created_at: TIMESTAMPTZ│
                           └──────────────────────┘
```

### Table Purposes

| Table | Purpose |
|---|---|
| `guilds` | Guild metadata cache. Prevents repeated Discord REST API calls. Source of truth for guild existence. |
| `guild_settings` | Key-value store for per-guild configuration. JSONB values allow flexible settings without schema changes. |
| `guild_roles` | Maps Discord role IDs to internal permission levels per guild. Enables guild admins to assign custom roles without code changes. |
| `users` | Global user record. Cached Discord user data. Cross-guild user identity. |
| `user_profiles` | Per-guild user data. Nickname, join date, leave date. Separate from users because profile data is guild-scoped. |
| `user_statistics` | Aggregated per-guild member metrics. Feeds leaderboards, XP systems, engagement dashboards. |
| `audio_library` | Catalog of all audio clips available in the voice system. Data-driven — adding a sound is an INSERT, not a code change. |
| `voice_settings` | Per-guild voice system configuration. Standby channel, cooldowns, reconnect policy, default sound. |
| `voice_events` | Immutable log of every voice action (join, move, play, disconnect). Used for debugging and analytics. |
| `warnings` | Moderation warnings with active/inactive state and optional expiration. |
| `moderation_logs` | Immutable audit trail of all moderation actions. Required for appeals, transparency, and compliance. |
| `command_logs` | Every command execution including latency and success/failure. Queryable for analytics and abuse detection. |
| `scheduled_jobs` | Generic job scheduler storage. Supports one-time and recurring jobs. Used by reminders, giveaways, birthdays, temp bans, cleanup. |
| `feature_flags` | Centralized feature toggle registry. Disabled modules produce zero side effects. |
| `audit_logs` | Application-level audit trail independent of Discord actions. Tracks config changes, data modifications, system events. |

### Index Strategy

```sql
-- guild_settings: fast key lookup per guild
CREATE UNIQUE INDEX idx_guild_settings_key ON guild_settings(guild_id, key);

-- guild_roles: find all permissions for a guild
CREATE INDEX idx_guild_roles_guild ON guild_roles(guild_id);

-- user_profiles: guild member lookup
CREATE UNIQUE INDEX idx_user_profiles_guild_user ON user_profiles(guild_id, user_id);

-- user_statistics: leaderboard queries
CREATE INDEX idx_user_stats_guild_commands ON user_statistics(guild_id, commands_used DESC);
CREATE INDEX idx_user_stats_guild_voice ON user_statistics(guild_id, voice_minutes DESC);

-- audio_library: catalog queries
CREATE INDEX idx_audio_library_guild ON audio_library(guild_id, enabled);
CREATE INDEX idx_audio_library_trigger ON audio_library(guild_id, trigger, enabled);

-- voice_events: recent event debugging
CREATE INDEX idx_voice_events_guild_date ON voice_events(guild_id, created_at DESC);

-- warnings: active warnings for a user
CREATE INDEX idx_warnings_user_active ON warnings(guild_id, user_id, active);

-- moderation_logs: target lookup + moderator lookup
CREATE INDEX idx_modlog_guild_target ON moderation_logs(guild_id, target_id, created_at DESC);
CREATE INDEX idx_modlog_guild_moderator ON moderation_logs(guild_id, moderator_id, created_at DESC);

-- command_logs: analytics
CREATE INDEX idx_cmdlog_guild_date ON command_logs(guild_id, created_at DESC);
CREATE INDEX idx_cmdlog_user ON command_logs(user_id, created_at DESC);

-- scheduled_jobs: polling for due jobs
CREATE INDEX idx_scheduled_jobs_due ON scheduled_jobs(completed, execute_at) WHERE completed = false;

-- feature_flags: fast toggle lookup
CREATE UNIQUE INDEX idx_feature_flags_key ON feature_flags(flag_key);

-- audit_logs: investigation queries
CREATE INDEX idx_audit_logs_guild_date ON audit_logs(guild_id, created_at DESC);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id, created_at DESC);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
```

### Database Provider

Supabase PostgreSQL is the only supported database. The `IDatabaseAdapter` interface exists to keep the Supabase implementation details confined to `core/database/supabase.adapter.ts`, not to support multiple providers. All modules depend only on repository interfaces, never on the adapter or Supabase SDK directly.

---

## 10. Configuration System

### Design Principles

- **Single source of truth.** Configuration loads once at startup, validated, frozen.
- **Validated at boundary.** Zod schemas validate entire config on load. Invalid config → crash immediately.
- **Environment overrides.** `.env` values override JSON defaults. Secrets never in JSON files.
- **Feature toggles.** Every module has an `enabled` flag.
- **No hardcoded values anywhere in the codebase.**

### Configuration Files

#### `.env` — Secrets & Environment

```env
# Required — Discord
BOT_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
CLIENT_ID=123456789012345678

# Required — Supabase PostgreSQL
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Environment
NODE_ENV=production              # development | production
LOG_LEVEL=info                   # trace | debug | info | warn | error | fatal

# Optional overrides
GUILD_ID=123456789012345678
OWNER_IDS=123456789,987654321
```

#### `config/bot.json` — Bot Behavior

```json
{
  "prefix": "hoak",
  "guildId": "",
  "ownerIds": [],
  "defaultLanguage": "en",
  "presence": {
    "type": "WATCHING",
    "text": "the Hoak Family"
  },
  "cooldowns": {
    "global": 1000,
    "perUser": 3000
  }
}
```

#### `config/permissions.json` — Permission Role Mapping

```json
{
  "roles": {
    "administrator": ["Admin", "Hoak Admin"],
    "moderator": ["Moderator", "Hoak Mod", "Admin", "Hoak Admin"],
    "trusted": ["Trusted Member"]
  }
}
```

#### `config/feature-flags.json` — Feature Toggles

```json
{
  "modules": {
    "general": true,
    "voice": true,
    "moderation": true,
    "metrics": true,
    "tickets": false,
    "ai": false,
    "economy": false,
    "leveling": false,
    "dashboard": false
  }
}
```

### Config Service

```typescript
// core/config/config.service.ts
class ConfigService {
  load(): Readonly<AppConfig> {
    dotenv.config();
    const envConfig = this.parseEnv();
    const fileConfig = this.readJsonFiles();
    const merged = this.merge(envConfig, fileConfig);
    const validated = appConfigSchema.parse(merged);
    return Object.freeze(validated);
  }
}
```

Modules receive config via DI: `constructor(@inject(TOKENS.Config) private readonly config: AppConfig)`.

---

## 11. Command System

### Architecture

```
┌────────────────────────────────────────────────┐
│                 Discord Gateway                │
│                                                │
│  interactionCreate          messageCreate      │
│        │                         │             │
│        ▼                         ▼             │
│  SlashAdapter              PrefixAdapter       │
│        │                         │             │
│        └─────────┬───────────────┘             │
│                  │                             │
│                  ▼                             │
│          CommandRouter                         │
│  (looks up command in CommandRegistry)         │
│                  │                             │
│                  ▼                             │
│          Middleware Pipeline                   │
│  1. CooldownMiddleware                         │
│  2. PermissionMiddleware                       │
│  3. LoggingMiddleware                          │
│                  │                             │
│                  ▼                             │
│          Command.execute(ctx)                  │
│  (module's command handler)                    │
└────────────────────────────────────────────────┘
```

### ICommand Interface

Commands are defined within modules and registered into the shared CommandRegistry:

```typescript
interface ICommand {
  name: string;
  description: string;
  category: string;
  cooldown?: number;
  requiredPermissions?: PermissionLevel[];
  slashOptions?: SlashCommandBuilder;
  prefixAliases?: string[];
  execute(ctx: CommandContext): Promise<void>;
}
```

### CommandContext

```typescript
interface CommandContext {
  source: 'slash' | 'prefix';
  interaction?: ChatInputCommandInteraction;
  message?: Message;
  args: ReadonlyMap<string, unknown>;
  guild: Guild | null;
  user: User;
  member: GuildMember | null;
  channel: GuildTextBasedChannel | null;
}
```

### Prefix Parsing

Case-insensitive, strips the prefix, matches against `name` or `prefixAliases`:

```
"hoakhelp"   → matches command "help"
"HoAkHeLp"   → matches command "help"
"HOAKHELP"   → matches command "help"
"hoakha"     → matches command "help" via alias "ha"
```

### Slash Command Deployment

Script `scripts/deploy-commands.ts`:
1. Collects all `ICommand` registrations from `CommandRegistry`.
2. Builds `RESTPostAPIApplicationCommandsJSONBody[]`.
3. Calls `PUT /applications/{clientId}/guilds/{guildId}/commands`.
4. Reports per-command status.

Run manually after adding/editing commands. Not executed on bot startup.

### Middleware Pipeline

```typescript
interface IMiddleware {
  handle(ctx: CommandContext, next: () => Promise<void>): Promise<void>;
}
```

Pipeline order: Cooldown → Permission → Logging → Handler. Middleware is composed functionally. Adding new middleware requires creating one class and inserting it into the pipeline array.

---

## 12. Voice System

### Signature Feature: Follow & Play

**Workflow (Fully Automated):**

```
Bot ReadyEvent received from Event Bus
  │
  ▼
VoiceModule.onStart() → joinStandbyChannel()
  │
  ▼
Idle in standby channel
  │
  ▼
[VoiceMemberJoinedEvent received from Event Bus]
  │  (Discord adapter already filtered bots & self)
  ▼
QueueManager: is cooldown active?
  │ YES → drop event, publish CooldownBlockedEvent
  │ NO  → continue
  ▼
StateManager.transition(Idle → Moving)
  │
  ▼
ConnectionManager.moveTo(member's channel)
  │
  ▼
StateManager.transition(Moving → Playing)
  │
  ▼
AudioManager.play(defaultSound from voice_settings)
  │
  ▼
[AudioPlayer idle event]
  │
  ▼
StateManager.transition(Playing → Returning)
  │
  ▼
ConnectionManager.returnToStandby()
  │
  ▼
StateManager.transition(Returning → Idle)
  │
  ▼
[Resume waiting]
```

### Voice Settings (Data-Driven)

Voice behavior is configured per-guild via the `voice_settings` table:

| Field | Type | Purpose |
|---|---|---|
| `standby_channel` | TEXT | Channel ID for idle standby |
| `enabled` | BOOLEAN | Master voice system toggle per guild |
| `cooldown_ms` | INTEGER | Minimum time between triggers |
| `max_queue_size` | INTEGER | Max queued events (future use) |
| `reconnect_delay` | INTEGER | Initial reconnect delay (ms) |
| `max_reconnect` | INTEGER | Max reconnect attempts |
| `default_sound_id` | UUID | FK to audio_library.id |

### Audio Library Schema (Data-Driven)

Every sound is a row in `audio_library`. No hardcoded sound references:

| Field | Type | Example |
|---|---|---|
| `id` | UUID | auto-generated |
| `guild_id` | TEXT | "123456789" |
| `name` | TEXT | "hoak" |
| `display_name` | TEXT | "Hoak Hoak Hoak" |
| `description` | TEXT | "The signature Hoak sound" |
| `trigger` | TEXT | "voice_join" |
| `file_path` | TEXT | "assets/sounds/hoak.mp3" |
| `duration_ms` | INTEGER | 2500 |
| `volume` | REAL | 1.0 |
| `priority` | INTEGER | 1 |
| `cooldown_ms` | INTEGER | 5000 |
| `enabled` | BOOLEAN | true |
| `play_count` | INTEGER | 0 |

### Trigger Types

The `trigger` column in `audio_library` determines when a sound plays. Currently only `voice_join` is implemented. The architecture supports additional triggers (voice_leave, startup, shutdown, manual, random) as future configuration-only additions.

### Adding a New Sound

```sql
INSERT INTO audio_library (guild_id, name, display_name, description, trigger, file_path, duration_ms, volume, priority, cooldown_ms, enabled)
VALUES ('GUILD_ID', 'welcome', 'Welcome!', 'Played when someone joins', 'voice_join', 'assets/sounds/welcome.mp3', 3000, 0.8, 2, 10000, true);
```

1. Upload `welcome.mp3` to `assets/sounds/`.
2. Run the INSERT.
3. Restart bot or trigger config reload.

Zero source code changes required.

---

## 13. Voice Architecture

### Component Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                        VoiceModule                           │
│  (IModule implementation — receives DI, subscribes events)   │
└────────────┬─────────────────────────────────────────────────┘
             │ owns + orchestrates
             ▼
┌──────────────────────────────────────────────────────────────┐
│                       VoiceManager                           │
│  (Entry point for voice operations. Delegates to children.)  │
│                                                              │
│  processVoiceJoin(event)                                     │
│  joinStandby()                                               │
│  shutdown()                                                  │
└───┬─────────┬──────────┬───────────┬────────────────────────┘
    │         │          │           │
    ▼         ▼          ▼           ▼
┌────────┐ ┌───────┐ ┌───────┐ ┌──────────┐
│ConnMgr │ │Audio  │ │Queue  │ │State     │
│        │ │Mgr    │ │Mgr    │ │Mgr       │
└───┬────┘ └───┬───┘ └───┬───┘ └────┬─────┘
    │          │         │          │
    │          │         │          │
    ▼          ▼         ▼          ▼
┌─────────────────────────────────────────────────┐
│  @discordjs/voice   FFmpeg   Supabase Adapter   │
│  (Discord voice)    (encode) (audio_library)    │
└─────────────────────────────────────────────────┘
```

### Component Responsibilities

#### VoiceManager

- Receives `VoiceMemberJoinedEvent` from Event Bus.
- Orchestrates the full trigger → move → play → return lifecycle.
- Publishes `VoiceSoundPlayedEvent`, `VoiceConnectionLostEvent`, `VoiceConnectionRestoredEvent`.
- Does NOT directly interact with `@discordjs/voice` — delegates to child managers.

#### ConnectionManager

- Wraps `@discordjs/voice`'s `joinVoiceChannel()` and `VoiceConnection`.
- Methods: `join(channelId)`, `moveTo(channelId)`, `disconnect()`.
- Implements exponential backoff reconnect.
- Reports connection state to StateManager.

#### AudioManager

- Creates `AudioPlayer` and `AudioResource` via `@discordjs/voice`.
- Loads audio files from filesystem based on `audio_library.file_path`.
- Methods: `play(soundId)`, `stop()`.
- Tracks playback state (playing, idle, error).

#### QueueManager

- Enforces cooldown per guild.
- Drops events received during cooldown window.
- Publishes `CooldownBlockedEvent` when event is dropped.
- Future: supports FIFO queue of pending triggers.

#### StateManager

- FSM states: `Idle` → `Moving` → `Playing` → `Returning` → `Idle`.
- Validates transitions; rejects invalid state changes.
- Exposes `getState()` and `transition(to)`.

**State Diagram:**

```
         ┌──────────┐
         │   Idle   │◄──────────────────────────────┐
         └────┬─────┘                               │
              │ VoiceMemberJoinedEvent              │
              ▼                                     │
         ┌──────────┐      connection success       │
         │  Moving  │──────────────────────►  ┌──────────┐
         └────┬─────┘                        │ Playing  │
              │ connection failure            └────┬─────┘
              ▼                                     │ playback complete
         ┌──────────┐                               ▼
         │   Idle   │                         ┌────────────┐
         └──────────┘                         │ Returning  │
                                              └─────┬──────┘
                                                    │ reached standby
                                                    ▼
                                               ┌──────────┐
                                               │   Idle   │
                                               └──────────┘
```

### Reconnection Strategy

```
Connection lost
  │
  ▼
Publish VoiceConnectionLostEvent
  │
  ▼
Wait reconnectDelay (base: 3000ms)
  │
  ▼
Attempt reconnect to standby channel
  ├── Success → Publish VoiceConnectionRestoredEvent
  └── Failure → increment attempt
       ├── attempt < maxReconnect → wait delay * 2^attempt
       └── attempt >= maxReconnect → log error, stop trying
```

---

## 14. Cache Layer

### Architecture

```
┌─────────────────────────────┐
│       Business Logic         │
│  (modules, services)         │
└──────────────┬──────────────┘
               │ depends on
               ▼
┌─────────────────────────────┐
│      ICacheProvider          │
│  get<T>(key): T | null      │
│  set(key, value, ttl?)      │
│  del(key)                    │
│  has(key): boolean           │
│  clear()                     │
└──────────────┬──────────────┘
               │ implemented by
               ▼
┌─────────────────────────────┐
│     MemoryCacheProvider      │
│  In-memory Map with TTL      │
└─────────────────────────────┘
```

### Memory Cache

In-memory `Map<string, { value: unknown, expiresAt: number | null }>`. Fast, zero-config, sufficient for a single-server bot of this scale. Cache usage examples:

- Audio file metadata (avoid re-reading `audio_library` table on every voice trigger).
- Guild settings (cache `guild_settings` with TTL of 5 minutes).
- Cooldown state (stored with TTL equal to cooldown duration).
- Feature flag state (cache 60s).

---

## 15. Scheduler

### Architecture

```
┌──────────────────────────────────────┐
│           IScheduler                  │
│                                      │
│  scheduleAt(timestamp, job) → jobId  │
│  scheduleCron(cron, job) → jobId     │
│  cancel(jobId)                       │
│  getDueJobs() → Job[]                │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│        SchedulerService              │
│                                      │
│  Polls scheduled_jobs table every    │
│  5 seconds for due jobs.             │
│  For each due job:                   │
│    → Publish SchedulerJobDueEvent    │
│    → Update completed = true         │
└──────────────────────────────────────┘
```

### Job Types (Future Modules)

| Job Type | Module | Trigger |
|---|---|---|
| `reminder` | Reminders | User-specified time |
| `giveaway_end` | Giveaways | Giveaway creation + duration |
| `birthday` | Birthdays | Daily at configured time |
| `temp_mute_end` | Moderation | Mute command + duration |
| `temp_ban_end` | Moderation | Ban command + duration |
| `cleanup` | System | Periodic log cleanup, cache eviction |
| `backup` | System | Periodic database backup |

### Scheduling a Job

```typescript
await scheduler.scheduleAt(
  futureTimestamp,
  {
    type: 'reminder',
    guildId: '...',
    userId: '...',
    payload: { message: 'Check the oven!' },
  }
);
```

The `SchedulerJobDueEvent` is published to the Event Bus at the scheduled time. The interested module (e.g., RemindersModule) subscribes and handles delivery.

---

## 16. Metrics Service

### Architecture

```typescript
interface IMetrics {
  incrementCounter(name: string, labels?: Record<string, string>, value?: number): void;
  setGauge(name: string, value: number, labels?: Record<string, string>): void;
  observeHistogram(name: string, value: number, labels?: Record<string, string>): void;
  getMetrics(): MetricsSnapshot;
}
```

### Metrics Catalog

| Metric Name | Type | Labels | Description |
|---|---|---|---|
| `bot_uptime_seconds` | Gauge | — | Process uptime |
| `discord_gateway_ping_ms` | Gauge | — | Discord WebSocket latency |
| `discord_guild_count` | Gauge | — | Number of guilds the bot is in |
| `commands_total` | Counter | `command`, `source`, `success` | Total command executions |
| `commands_latency_ms` | Histogram | `command` | Command execution time |
| `voice_triggers_total` | Counter | `trigger_type` | Voice sound triggers |
| `voice_reconnects_total` | Counter | `guild_id` | Voice reconnection attempts |
| `voice_connection_state` | Gauge | `guild_id` | 0=disconnected, 1=connected |
| `event_bus_events_total` | Counter | `event_type` | Events flowing through Event Bus |
| `event_bus_errors_total` | Counter | `event_type` | Failed event handlers |
| `db_query_latency_ms` | Histogram | `operation` | Database query duration |
| `cache_hit_ratio` | Gauge | `provider` | Cache hit rate |
| `errors_total` | Counter | `type`, `module` | Application errors |
| `memory_usage_bytes` | Gauge | `type` | RSS, heap used, heap total |
| `cpu_usage_percent` | Gauge | — | Process CPU usage |
| `scheduled_jobs_due` | Gauge | — | Pending jobs in queue |
| `feature_flags_enabled` | Gauge | `flag` | Which features are active |
| `health_status` | Gauge | `subsystem` | 0=unhealthy, 1=healthy |

### Consumption

| Consumer | How |
|---|---|
| Health Service | Reads `health_status` gauges |
| Metrics Module | `/stats` command shows top metrics |
| Pino Logger | Metrics values logged on interval |

---

## 17. Health Service

### Architecture

```typescript
interface IHealthService {
  check(): HealthReport;
}

interface HealthReport {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: number;
  uptime: number;
  subsystems: Record<string, SubsystemHealth>;
}

interface SubsystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latencyMs?: number;
  message?: string;
  metadata?: Record<string, unknown>;
}
```

### Subsystems Checked

| Subsystem | Check |
|---|---|
| Discord Gateway | `client.ws.ping < 5000` and `client.ws.status === 0` |
| Database | Execute `SELECT 1` and measure latency |
| Cache | `.has('health_check')` test |
| Voice (per guild) | Check voice connection state |
| Scheduler | Check last poll timestamp is within 30s |
| Event Bus | Check subscriber count > 0 |
| Memory | RSS < configured max |
| CPU | Usage < 90% |

### Health Report Example

```json
{
  "status": "healthy",
  "timestamp": 1719600000000,
  "uptime": 86400,
  "subsystems": {
    "discord": { "status": "healthy", "latencyMs": 45 },
    "database": { "status": "healthy", "latencyMs": 2 },
    "cache": { "status": "healthy", "latencyMs": 0 },
    "voice": { "status": "healthy", "latencyMs": 0, "metadata": { "state": "idle" } },
    "scheduler": { "status": "healthy", "metadata": { "pendingJobs": 3 } },
    "eventBus": { "status": "healthy", "metadata": { "subscriberCount": 18 } },
    "memory": { "status": "healthy", "metadata": { "rssMB": 128, "heapUsedMB": 64 } },
    "cpu": { "status": "healthy", "metadata": { "percent": 12 } }
  }
}
```

---

## 18. Feature Flags

### Architecture

```typescript
interface IFeatureFlags {
  isEnabled(flagKey: string): boolean;
  allFlags(): Readonly<Record<string, boolean>>;
}
```

### Flag Registry (`config/feature-flags.json`)

```json
{
  "modules": {
    "general": true,
    "voice": true,
    "moderation": true,
    "metrics": true,
    "tickets": false,
    "ai": false,
    "economy": false,
    "leveling": false,
    "dashboard": false
  }
}
```

### Integration with Module Loader

```
ModuleLoader.scan()
  │
  ├─ For each module directory:
  │   ├─ Read feature-flags.json
  │   ├─ If !flags.modules[moduleName] → skip (don't import, don't register)
  │   └─ If flags.modules[moduleName] → import, register, start
  │
  └─ Log loaded and skipped modules
```

### Extending Flags

Future flags can be added for:
- Per-command toggles (`commands.warn.enabled`)
- Per-guild overrides (stored in `guild_settings`)
- A/B testing variants
- Graceful degradation switches

---

## 19. Logging System

### Logger Architecture

```
Module Code
  │
  ▼
logger.child({ module: 'voice', guildId: '...' })
  │
  ▼
Pino Logger (configured per environment)
  │
  ├──► stdout (pino-pretty in development)
  ├──► file (rotating via pino-roll in production)
  └──► [Future] external log aggregator (Loki, Datadog, etc.)
```

### Log Levels

| Level | Usage |
|---|---|
| `fatal` | Unrecoverable errors requiring process exit |
| `error` | Operation failures (command failed, voice disconnect, DB error) |
| `warn` | Unexpected but recoverable (cooldown hit, unknown command, rate limit) |
| `info` | Business events (command used, voice triggered, member joined, bot started) |
| `debug` | Detailed developer info (config loaded, middleware passed, state transitions) |
| `trace` | Full argument dumps, performance traces (never in production) |

### Required Log Events

| Event | Level | Context |
|---|---|---|
| Bot startup | `info` | `{ nodeVersion, guildCount, pingMs }` |
| Module loaded | `info` | `{ module, enabled, commands, events }` |
| Module skipped | `debug` | `{ module, reason: 'feature_flag_disabled' }` |
| Graceful shutdown | `info` | `{ reason }` |
| Command execution | `info` | `{ command, source, userId, guildId, latencyMs }` |
| Command error | `error` | `{ command, source, userId, guildId, error }` |
| Event bus publish | `debug` | `{ eventType, payload }` |
| Voice state change | `debug` | `{ userId, guildId, fromChannel, toChannel }` |
| Voice sound played | `info` | `{ guildId, channelId, soundId, soundName }` |
| Voice error | `error` | `{ guildId, operation, error }` |
| Voice reconnect attempt | `warn` | `{ guildId, attempt, maxRetries }` |
| Moderation action | `info` | `{ guildId, moderatorId, targetId, action, reason }` |
| Member join | `info` | `{ guildId, userId, memberCount }` |
| Member leave | `info` | `{ guildId, userId, memberCount }` |
| Cooldown blocked | `warn` | `{ userId, command, remainingMs }` |
| Permission denied | `warn` | `{ userId, command, requiredLevel, userLevel }` |
| Config validation error | `fatal` | `{ errors }` (process exits) |
| Database error | `error` | `{ operation, error }` |
| Health check | `debug` | `{ status, unhealthySubsystems }` |
| Feature flag change | `info` | `{ flagKey, from, to }` |
| Scheduler job fired | `info` | `{ jobType, jobId, guildId }` |

### Log Rotation (Production)

- **By time:** New log file daily at midnight UTC.
- **By size:** Rotate when file exceeds 10 MB.
- **Retention:** Keep 14 days of logs.
- **Naming:** `logs/hoakbot-YYYY-MM-DD-HH.log`.
- **Compression:** Optional gzip of rotated files (configurable).

### Log Format

- **Development:** Colored, human-readable via `pino-pretty`.
- **Production:** Newline-delimited JSON (NDJSON). Each line is a self-contained JSON object parseable by log aggregation tools.

---

## 20. Permission System

### Permission Levels

```typescript
enum PermissionLevel {
  Everyone = 0,
  Trusted = 1,
  Moderator = 2,
  Administrator = 3,
  Owner = 4,
}
```

### Resolution Flow

```
PermissionMiddleware
  │
  ├─ Command's required level === Everyone? → pass
  ├─ User ID in config.ownerIds? → pass (level 4)
  ├─ Check guild_roles table for user's roles:
  │    ├─ Has Administrator role? → pass (level 3)
  │    ├─ Has Moderator role? → pass (level 2)
  │    └─ Has Trusted role? → pass (level 1)
  └─ Otherwise → publish PermissionDeniedEvent, reject
```

### Guild-Specific Role Mapping

The `guild_roles` table maps Discord role IDs to internal permission levels per guild. This means:

- Role names are configurable per guild.
- Multiple role IDs can map to the same permission level.
- Guild admins can rename roles without code changes — update the `guild_roles` table.
- New guilds automatically get default mappings from `config/permissions.json`.

### Usage in Commands

Commands declare their required level. The middleware checks before execution. No permission logic inside command handlers:

```typescript
@Command({
  name: 'warn',
  category: 'moderation',
  requiredPermissions: [PermissionLevel.Moderator],
})
export class WarnCommand implements ICommand {
  async execute(ctx: CommandContext): Promise<void> {
    // Permission already guaranteed by middleware
  }
}
```

---

## 21. Event System

### Discord Event → Internal Event Flow

```
┌─────────────────────────┐
│     Discord Gateway      │
│  voiceStateUpdate(...)   │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  adapters/voice-state-   │
│  update.adapter.ts       │
│                          │
│  1. Filter bots          │
│  2. Filter self          │
│  3. Detect join/leave    │
│  4. Build DTO             │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  EventBus.publish(       │
│    VoiceMemberJoinedEvent│
│    { guildId, userId,    │
│      channelId }         │
│  )                        │
└────────────┬────────────┘
             │
    ┌────────┼────────┬────────────┐
    ▼        ▼        ▼            ▼
┌────────┐ ┌──────┐ ┌──────┐ ┌──────────┐
│ Voice  │ │Metrics│ │Audit │ │[Future]  │
│Module  │ │Module │ │Module│ │Dashboard │
└────────┘ └──────┘ └──────┘ └──────────┘
```

### Design Principles

- **Thin adapters.** Discord event files do nothing except filter, transform, and publish to the Event Bus.
- **Zero business logic in adapters.** The adapter doesn't know what modules care about the event.
- **Typed events.** Each internal event has a TypeScript interface. The Event Bus enforces types.
- **Error isolation.** One handler throwing does not prevent other handlers from executing.
- **Modules own their event subscriptions.** Each module calls `eventBus.subscribe()` during `register()`.

### Event Catalog (Partial)

See [§8 Internal Event Bus](#8-internal-event-bus) for the complete list.

---

## 22. PM2 Deployment

### `ecosystem.config.js`

```javascript
module.exports = {
  apps: [
    {
      name: 'hoakbot',
      script: 'dist/bootstrap.js',
      interpreter: 'node',

      // Memory
      max_memory_restart: '512M',
      max_restarts: 10,
      restart_delay: 5000,

      // Graceful shutdown
      kill_timeout: 15000,
      wait_ready: true,
      listen_timeout: 20000,

      // Logging
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      merge_logs: true,

      // Environment
      env: {
        NODE_ENV: 'production',
      },

      // Execution
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
    },
  ],
};
```

### PM2 Commands

```bash
pm2 start ecosystem.config.js    # Start
pm2 restart hoakbot              # Restart
pm2 stop hoakbot                 # Stop
pm2 logs hoakbot                 # View logs
pm2 status                       # Status
pm2 startup systemd              # Auto-start on boot
pm2 save                         # Save pm2 process list
```

### Deployment Strategy

1. **CI/CD (future):** `git pull` → `npm ci --production` → `npm run build` → `npm run migrate` → `pm2 reload hoakbot`.
2. **Manual:** `ssh vps` → `cd /opt/hoakbot` → pull → install → build → migrate → reload.
3. **Graceful reload:** On `pm2 reload`, the new process starts and signals the old process (via IPC or shared flag). Old process completes shutdown lifecycle (disconnect Discord, close DB, flush logs) and exits.
4. **Rollback:** `pm2 stop hoakbot` → deploy previous build → `pm2 start hoakbot`.

### VPS System Dependencies

```bash
apt update && apt install -y \
  nodejs \
  npm \
  ffmpeg \
  build-essential \
  python3
```

`build-essential` is required for native module compilation if any dependencies require it.

---

## 23. Future Expansion

Every future feature is a new module. No architectural changes needed. The module system, Event Bus, repository pattern, and scheduler make adding features a matter of creating a new directory and registering it.

### Ideas for Future Modules

| Future Module | What It Would Do | How It Would Integrate |
|---|---|---|
| **Tickets** | Support ticket channels | New `tickets` table, subscribes to `MemberLeftEvent` for auto-close |
| **Music** | YouTube/Spotify playback in voice | New commands, leverages existing VoiceManager for connection + audio |
| **Temp Voice** | Temporary voice channels created on demand | Subscribes to `VoiceMemberJoinedEvent` |
| **Welcome** | Greet new members with a message | Subscribes to `MemberJoinedEvent` |
| **Auto Mod** | Automatic spam/link filtering | Subscribes to messageCreate via adapter |
| **Leveling** | XP and rank cards | Extends `user_statistics`, subscribes to command/message events |
| **Economy** | Virtual currency system | New `economy_balances` table, standalone commands |
| **Birthdays** | Birthday announcements | Uses Scheduler for daily check |
| **Reminders** | Timed remind-me feature | Uses `scheduled_jobs` table, subscribes to `SchedulerJobDueEvent` |
| **Polls** | Embedded poll creation | New `polls` table, standalone commands |
| **Giveaways** | Timed giveaway system | New `giveaways` table, uses Scheduler for end timer |
| **AI** | ChatGPT-powered `/ask` command | New module with external API client |

### Key Design Decisions Enabling Future Growth

| Decision | Impact |
|---|---|
| **Module-Based Architecture** | Every feature is a self-contained module. Adding one has zero impact on others. |
| **Internal Event Bus** | New modules subscribe to existing events without modifying event publishers. Loose coupling. |
| **Feature Flags** | Disable modules globally. Ship experimental features dark. |
| **Repository Pattern** | Modules depend on interfaces, not SQL queries. Testing with mocks is trivial. |
| **DI Container** | Dependencies are explicit and swappable. No hidden global state. |
| **Shared Command Pipeline** | Slash + Prefix support with zero duplication. |
| **Data-Driven Voice** | New sounds are database rows + audio files, not code changes. |
| **`scheduled_jobs` Table** | Every time-based feature reuses the same scheduler infrastructure. |
| **Health + Metrics** | Operations visibility built in from day one. |

---

## 24. Documentation Structure

```
docs/
├── architecture/                  # Architecture overview & decisions
│   ├── OVERVIEW.md               # High-level system design
│   └── adr/                       # Architecture Decision Records
│       ├── 001-di-container.md    # Why custom DI over tsyringe/InversifyJS
│       ├── 002-event-bus.md       # Why internal Event Bus over direct imports
│       ├── 003-module-loader.md   # Why automatic module discovery
│       ├── 004-database-adapter.md # Why adapter pattern over direct SDK usage
│       └── README.md              # ADR index + template
│
├── database/                      # Database documentation
│   ├── schema.md                  # Full schema with relationships
│   ├── migrations.md              # Migration policy & how-to
│   └── queries.md                 # Common query patterns
│
├── deployment/                    # Deployment guides
│   ├── vps-setup.md               # Ubuntu VPS initial setup
│   ├── pm2.md                     # PM2 configuration
│   └── supabase-setup.md          # Supabase project setup
│
├── modules/                       # Per-module documentation
│   ├── module-guide.md            # How to create a new module
│   ├── general.md                 # General module reference
│   ├── voice.md                   # Voice module reference
│   └── moderation.md             # Moderation module reference
│
├── roadmap/                       # Roadmap
│   └── phases.md                  # Detailed phase breakdown
│
├── api/                           # Internal API reference
│   ├── event-catalog.md           # All internal events
│   ├── container-tokens.md        # All DI tokens
│   └── repository-interfaces.md   # All repository interfaces
│
├── development/                   # Developer guides
│   ├── setup.md                   # Local development setup
│   ├── testing.md                 # Testing strategy
│   └── contributing.md            # Contribution guide
│
└── README.md                      # Documentation index
```

### Architecture Decision Records

Every significant architectural choice is documented as an ADR. Each ADR includes:

1. **Title** — Short name
2. **Status** — Proposed | Accepted | Deprecated | Superseded
3. **Context** — What problem are we solving?
4. **Decision** — What did we choose?
5. **Consequences** — What are the trade-offs?

---

## 25. Dependency Planning

### Core Dependencies

| Package | Version | Purpose |
|---|---|---|
| `discord.js` | ^14.x | Discord API client (gateway, REST, caching) |
| `@discordjs/rest` | ^2.x | REST client for slash command deployment |
| `@discordjs/voice` | ^0.x | Voice connections, audio streaming, FFmpeg integration |
| `@discordjs/collection` | ^2.x | Typed Map with Discord utilities (used in cooldown, cache) |
| `dotenv` | ^16.x | Load `.env` into `process.env` |
| `pino` | ^9.x | Structured JSON logging |
| `pino-pretty` | ^11.x | Colored dev-mode log output |
| `pino-roll` | ^4.x | Automatic log file rotation |
| `zod` | ^3.x | Runtime configuration and input validation |
| `postgres` | ^3.x | PostgreSQL client (used by SupabaseAdapter) |
| `ms` | ^2.x | Human-readable time parsing |

### Development Dependencies

| Package | Version | Purpose |
|---|---|---|
| `typescript` | ^5.x | Type checking + compilation |
| `tsx` | ^4.x | Fast dev-mode TypeScript runner |
| `eslint` | ^9.x | Static analysis |
| `@typescript-eslint/parser` | ^8.x | ESLint TypeScript parser |
| `@typescript-eslint/eslint-plugin` | ^8.x | ESLint TypeScript rules |
| `prettier` | ^3.x | Code formatting |
| `eslint-config-prettier` | ^9.x | ESLint + Prettier compatibility |
| `nodemon` | ^3.x | File-watch restart |

### Voice Dependencies

| Package | Version | Purpose |
|---|---|---|
| `libsodium-wrappers` | ^0.7.x | Encryption for voice data |
| `ffmpeg-static` | ^5.x | Bundled FFmpeg binary (dev convenience) |
| `prism-media` | ^2.x | Opus/WebM audio transcoding |

**System dependency:** FFmpeg installed on VPS (`apt install ffmpeg`).

### Database Dependencies

| Package | Version | Purpose |
|---|---|---|
| `postgres` | ^3.x | Lightweight, fast PostgreSQL client |

No ORM. Raw SQL with parameterized queries inside repository implementations. Repository pattern provides the abstraction layer.

### Why Each Key Choice

- **`postgres` (npm package)** — Minimal PostgreSQL client. No ORM overhead, no migration framework baggage. Query templates prevent SQL injection.
- **No `@supabase/supabase-js`** — The adapter pattern isolates the database client. The SupabaseAdapter uses the `postgres` package directly with the Supabase connection string. This keeps the application decoupled from Supabase-specific APIs (Auth, Storage, Realtime) which are not needed.
- **Zod for config validation** — Prevents silent failures from malformed config. Catches type errors at startup, not at runtime.
- **No `tsyringe`/`InversifyJS`** — These DI libraries add complexity (decorators, reflect-metadata) for features we don't need (interceptors, AOP). A lightweight hand-rolled container is simpler to debug and has zero framework lock-in.

### Packages Intentionally NOT Included

| Package | Reason |
|---|---|
| `@supabase/supabase-js` | Adapter uses raw `postgres` client; Supabase SDK brings unnecessary Auth/Storage/Realtime APIs |
| `prisma` / `typeorm` / `knex` | ORMs add overhead. Repository pattern with raw SQL is more explicit and performant |
| `keyv` | Cache abstraction is custom and simpler |
| `winston` | Pino is faster with native structured JSON |
| `commander` / `yargs` | Bot commands use Discord interactions, not CLI |
| `tsyringe` / `InversifyJS` | Custom DI container is lighter and avoids decorator/reflect-metadata overhead |

---

## 26. Architectural Principles

### SOLID Compliance

| Principle | Application |
|---|---|
| **S**ingle Responsibility | VoiceManager orchestrates but doesn't play audio. AudioManager plays but doesn't connect. Each class has one reason to change. |
| **O**pen/Closed | New modules extend system behavior (open) without modifying existing modules or core (closed). New sounds are database rows, not code. |
| **L**iskov Substitution | Every `ICommand` works identically whether invoked via slash or prefix. Every repository implementation works behind the same interface. |
| **I**nterface Segregation | `ICommand` has minimal surface (name, description, execute). `IEvent` is even smaller. Repository interfaces are table-specific. |
| **D**ependency Inversion | Modules depend on `IDatabaseAdapter`, not `SupabaseAdapter`. Depend on `ICacheProvider`, not `MemoryCacheProvider`. Depend on `IEventBus`, not concrete implementation. |

### Composition over Inheritance

- Middleware pipeline composes behaviors without subclassing.
- VoiceManager composes ConnectionManager + AudioManager + QueueManager + StateManager.
- Module behavior extended via Event Bus subscriptions, not class hierarchy.
- No deep inheritance chains anywhere.

### Clean Architecture Layers

```
┌──────────────────────────────────────────┐
│     Adapters (Discord, HTTP, WS)         │ ← Outer layer
├──────────────────────────────────────────┤
│     Modules (business logic)              │
├──────────────────────────────────────────┤
│     Core Infrastructure                   │
│     (DI, EventBus, DB, Cache, Logger)    │ ← Inner layer
└──────────────────────────────────────────┘

Dependency direction: Outer → Inner, never Inner → Outer.
```

### Explicit Dependencies

- All service dependencies declared as constructor parameters.
- DI container resolves and injects.
- NO `import config from '../../config'` deep in module code.
- NO `import db from '../../database'` in command handlers.
- NO global mutable state.

### Fail Fast

- Configuration validated at startup via Zod. Invalid config = crash immediately, not hours later.
- Database connection tested at startup. Missing tables = migration error = crash.
- Discord token invalid = login failure = crash.
- Feature flags that reference non-existent modules = validation error = crash.

### Convention over Configuration

- Module directory name equals module name.
- Module file named `{name}.module.ts`.
- Command files named `{name}.command.ts`.
- Event handler files named `{name}.handler.ts`.
- Module Loader discovers all automatically.
- Barrel exports at every directory level.

---

## Appendix A: Bootstrap Sequence Diagram

```
bootstrap.ts
  │
  ├─ 1. ConfigService.load()
  │     ├─ dotenv.config()
  │     ├─ Read JSON files
  │     ├─ Merge env overrides
  │     └─ Zod validate + freeze
  │
  ├─ 2. Container.register(CoreServices)
  │     ├─ Config, Logger, EventBus
  │     ├─ DatabaseAdapter (Supabase)
  │     ├─ CacheProvider (Memory)
  │     ├─ Scheduler, Metrics, Health
  │     ├─ FeatureFlags, Permissions
  │     └─ DiscordClient
  │
  ├─ 3. DatabaseAdapter.connect()
  │     ├─ Run pending migrations
  │     └─ Verify schema version
  │
  ├─ 4. ModuleLoader.scan('src/modules/')
  │     ├─ For each directory:
  │     │   ├─ Check feature-flags.json
  │     │   ├─ If disabled → skip
  │     │   └─ If enabled → import, call register(container), call onStart()
  │     └─ Log loaded/skipped modules
  │
  ├─ 5. HealthService.check()
  │     └─ Verify all subsystems healthy
  │
  ├─ 6. DiscordClient.login(token)
  │     └─ Gateway connection established
  │
  ├─ 7. Attach Discord event adapters
  │     └─ ready, messageCreate, interactionCreate, voiceStateUpdate, ...
  │
  ├─ 8. Register signal handlers
  │     ├─ SIGTERM → graceful shutdown
  │     └─ SIGINT → graceful shutdown
  │
  └─ 9. Bot operational
        └─ EventBus.publish(BotReadyEvent)
```

## Appendix B: Shutdown Sequence Diagram

```
SIGTERM received
  │
  ├─ 1. Set isShuttingDown = true
  │     └─ Cooldown middleware + voice system reject new operations
  │
  ├─ 2. EventBus.publish(ShutdownEvent)
  │     └─ Modules begin cleanup (VoiceModule disconnects from voice)
  │
  ├─ 3. DiscordClient.destroy()
  │     └─ Close WebSocket, complete pending REST requests
  │
  ├─ 4. For each module (reverse registration order):
  │     └─ module.onShutdown()
  │
  ├─ 5. SchedulerService.stop()
  │     └─ Stop polling for due jobs
  │
  ├─ 6. CacheProvider.close()
  │     └─ Flush pending writes if any
  │
  ├─ 7. DatabaseAdapter.disconnect()
  │     └─ Close connection pool
  │
  ├─ 8. Logger.info('Shutdown complete')
  │     └─ Flush log buffers
  │
  └─ 9. process.exit(0)
```

## Appendix C: Module Development Template

```typescript
// src/modules/example/example.module.ts
import { IModule } from '../module.interface';
import { IContainer } from '../../core/container/types';

export class ExampleModule implements IModule {
  readonly name = 'example';
  readonly version = '1.0.0';
  readonly enabled = true;

  register(container: IContainer): void {
    // Register commands
    const commandRegistry = container.resolve(TOKENS.CommandRegistry);
    commandRegistry.register(new ExampleCommand(/* deps from container */));

    // Subscribe to events
    const eventBus = container.resolve(TOKENS.EventBus);
    eventBus.subscribe(MemberJoinedEvent, this.onMemberJoined.bind(this));

    // Register module-specific services
    container.registerSingleton(TOKENS.ExampleService, () => new ExampleService(/* deps */));
  }

  async onStart(): Promise<void> {
    // Startup logic (e.g., load data, schedule jobs)
  }

  async onShutdown(): Promise<void> {
    // Cleanup logic
  }

  private async onMemberJoined(event: MemberJoinedEvent): Promise<void> {
    // Handle event
  }
}
```

---

**Document Status:** Final implementation blueprint — approved.

**Next Step:** Phase 0 — Project Scaffolding.
