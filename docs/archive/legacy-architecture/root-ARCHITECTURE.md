# Historical Architecture: Hoak Bot System Architecture v3

> Archived by Release Phase R3. This document describes the pre-v4 module architecture and is no longer normative for baseline promotion. The current architecture is `docs/ARCHITECTURE.md`; current ADR authority is `docs/adr/ADR-011-Plugin-System.md` through `docs/adr/ADR-014-Command-Discovery.md`.

**Version:** 3.0 — Configuration Platform  
**Status:** Architecture Approved  
**Target:** Node.js 22 LTS + PM2 + Supabase PostgreSQL  
**Community:** Hoak Family Discord (1 server, < 50 members)

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [System Architecture Overview](#2-system-architecture-overview)
3. [Core Systems](#3-core-systems)
4. [Module System](#4-module-system)
5. [Configuration Platform](#5-configuration-platform)
6. [Dashboard Architecture](#6-dashboard-architecture)
7. [API Layer](#7-api-layer)
8. [Data Flow](#8-data-flow)
9. [Module Lifecycle](#9-module-lifecycle)
10. [Documentation Structure](#10-documentation-structure)

---

## 1. Design Philosophy

### Scope

| Aspect | Reality |
|--------|---------|
| Servers | 1 guild |
| Members | < 50 |
| Developers | 1 |
| Deployment | Single Ubuntu VPS via PM2 |
| Database | Supabase PostgreSQL |
| HA / Clustering | Not needed |

### Core Tenets

| Tenet | Meaning |
|-------|---------|
| **Platform over Product** | Contracts (IConfigProvider, IModuleManifest, ISettingsRegistry) are the product. Dashboard is a client. Bot is a client. |
| **Metadata over Code** | Every module declares structure as data. Dashboard renders from metadata. No switch(module), no hardcoded pages. |
| **Registry over Discovery** | Canonical registries for every concern. Consumed by API. No filesystem scanning at runtime. |
| **Explicit over Implicit** | Modules declare dependencies, settings, permissions, API endpoints, events in their manifest. |
| **Zero Polling** | Configuration changes propagate via events. Cache invalidates on write. Dashboard updates via WebSocket. |
| **Schema-First Validation** | Zod at every boundary. Invalid data is rejected at the boundary. |

---

## 2. System Architecture Overview

### High-Level Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                       Discord Gateway                            │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                     Discord Adapters                              │
│        (Event translators, Command router, Middleware)            │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                      Internal Event Bus                           │
│              (Module-owned events + infrastructure events)        │
└────┬──────────┬──────────┬──────────┬──────────┬────────────────┘
     │          │          │          │          │
     ▼          ▼          ▼          ▼          ▼
┌──────┐  ┌──────┐  ┌──────┐  ┌─────────┐  ┌──────────┐
│Voice │  │ Mod  │  │General│  │ Logging │  │ Future   │
│Module│  │Module│  │Module │  │ Module  │  │ Modules  │
└──────┘  └──────┘  └──────┘  └─────────┘  └──────────┘
     │          │          │          │          │
     └──────────┴──────────┴──────────┴──────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                    Configuration Platform                         │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │ Config       │  │ Settings     │  │ Permission            │  │
│  │ Provider     │  │ Registry     │  │ Registry              │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬────────────┘  │
│         │                 │                      │                │
│  ┌──────▼─────────────────▼──────────────────────▼────────────┐  │
│  │                     API Layer                                │  │
│  │    (Embedded server: auth, rate limit, validation, CRUD)    │  │
│  └──────┬─────────────────┬──────────────────────┬────────────┘  │
│         │                 │                      │                │
│         ▼                 ▼                      ▼                │
│  ┌──────────┐  ┌──────────────────┐  ┌───────────────────────┐  │
│  │Dashboard │  │ CLI              │  │ Future Mobile App     │  │
│  │ (SPA)    │  │ (Future)         │  │ (Future)              │  │
│  └──────────┘  └──────────────────┘  └───────────────────────┘  │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                    Core Infrastructure                            │
│  DI Container │ Logger │ Cache │ Database │ Scheduler           │
│  Metrics │ Health │ Feature Flags │ Audit                       │
└───────────────────────────────────────────────────────────────────┘
```

### Client Independence

```
                    ┌──────────────────────┐
                    │   Platform Layer      │
                    │   (API + Registries)  │
                    └──────┬───────────────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
   ┌────────────┐  ┌────────────┐  ┌────────────────┐
   │ Discord Bot │  │ Dashboard  │  │ Future Clients  │
   │ (existing)  │  │  (milestone │  │ (CLI, Mobile,   │
   │             │  │    7)       │  │  SDK, Automation)│
   └────────────┘  └────────────┘  └────────────────┘
```

Clients never import bot code. They communicate through the API. The API never references specific modules — it reads from registries.

---

## 3. Core Systems

### 3.1 DI Container

Unchanged from v2. Lightweight IoC container with singleton/transient/factory scopes. Circular dependency detection. All services receive dependencies via constructor injection.

### 3.2 Configuration Platform

Central to v3. See §5.

### 3.3 Event Bus

Unchanged from v2 with two changes:
1. Module-owned events (no longer all in one file)
2. New naming convention: `[domain].[entity].[action]`

Core events only:
- `system.bot.ready`
- `system.bot.error`
- `system.shutdown`
- `config.setting.changed`

### 3.4 Logger

Unchanged from v2 (Pino-based).

### 3.5 Database

Unchanged adapter pattern with new tables:
- `guild_settings` — Per-guild module settings (JSONB)
- `config_audit_log` — Configuration change audit trail
- `module_states` — Per-guild module enable/disable
- `permission_overrides` — Per-guild role/user permission overrides

### 3.6 Cache

Implemented (was empty in v2):
- `MemoryCacheProvider` — Map-based with TTL
- Cache key: `{guildId}:{settingKey}`
- Cache warming on startup
- Invalidation on config write

### 3.7 Permission System

Migrated from role-level to action-based:
- Modules declare actions (e.g., `voice:configure`)
- Roles/users have action-level overrides
- 6 default levels: everyone, member, trusted, moderator, administrator, owner

### 3.8 Audit

New system for configuration change tracking. Every write is logged to `config_audit_log` with before/after values, actor, source, and timestamp.

---

## 4. Module System

### Module Interface (v3)

```typescript
interface IModule {
  readonly manifest: IModuleManifest;

  // Registration lifecycle (dependency order)
  onPreRegister?(ctx: IModuleContext): Promise<void>;
  onRegister?(ctx: IModuleContext): Promise<void>;
  onPostRegister?(ctx: IModuleContext): Promise<void>;

  // Start lifecycle (dependency order)
  onPreStart?(ctx: IModuleContext): Promise<void>;
  onStart?(ctx: IModuleContext): Promise<void>;
  onPostStart?(ctx: IModuleContext): Promise<void>;

  // Runtime
  onConfigChange?(changes: ConfigChangeEvent[], ctx: IModuleContext): Promise<void>;

  // Shutdown lifecycle (reverse dependency order)
  onPreStop?(ctx: IModuleContext): Promise<void>;
  onStop?(ctx: IModuleContext): Promise<void>;
  onPostStop?(ctx: IModuleContext): Promise<void>;
}
```

### Module Structure

```
modules/voice/
├── voice.module.ts          # IModule implementation
├── voice.manifest.ts        # Static manifest data
├── voice.settings.ts        # ISettingMetadata[] (for SettingsRegistry)
├── voice.permissions.ts     # IPermissionAction[] (for PermissionRegistry)
├── voice.api.ts             # IAPIEndpoint[] (for APIRegistry, optional)
├── commands/                # Slash + prefix command handlers
├── events/                  # Internal event handlers
├── services/                # Business logic services
├── repositories/            # Data access layer
├── migrations/              # Module-specific DB migrations
├── types.ts                 # Module-owned events + types
└── index.ts                 # Barrel export
```

### Module Manifest

```typescript
interface IModuleManifest {
  id: string;                    // "hoak:voice"
  name: string;                  // "Voice"
  description: string;           // "Voice following and sound playback"
  icon: string;                  // Lucide icon name: "headphones"
  color: string;                 // Hex accent: "#5865F2"
  category: ModuleCategory;      // "voice" | "moderation" | ...
  version: string;               // "1.0.0"
  author: string;
  license: string;
  settings: string[];            // Setting keys registered
  permissions: string[];         // Permission action keys
  commands: string[];            // Command names
  events: string[];              // Event names published/subscribed
  routes: string[];              // API routes registered
  metrics: string[];             // Metric names exposed
  migrations: string[];          // Migration IDs
  featureFlags: string[];        // Feature flag keys
  healthChecks: string[];        // Health check names
  dependencies: string[];        // Module IDs depended on
  tags: string[];
  supportsHotReload: boolean;
  requiredDiscordPermissions: string;
  documentation: string;
  dashboard: DashboardConfig;
}
```

### Module Discovery

Build-time: `scripts/generate-module-index.ts` scans `src/modules/*/<name>.manifest.ts` and generates `src/modules/module-index.ts`. The module loader imports this index. No runtime filesystem scanning.

---

## 5. Configuration Platform

### Architecture

```
┌──────────────┐
│  Consumer     │
│  (Service,    │
│   Command,    │
│   Handler)    │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────────┐
│            ConfigProvider (facade)        │
├──────────────────────────────────────────┤
│   get(key, guildId) → Promise<T>         │
│   set(key, value, opts) → Promise<void>  │
│   watch(key, handler) → unsubscribe      │
└──────┬──────────────┬───────────────────┘
       │              │
       ▼              ▼
┌──────────────┐  ┌──────────────────────────┐
│ CacheProvider │  │  DatabaseConfigProvider   │
│ (Memory)      │  │  (guild_settings table)   │
└──────────────┘  └──────────┬───────────────┘
                             │ fallback
                             ▼
                    ┌──────────────────────────┐
                    │  DefaultConfigProvider    │
                    │  (from manifest defaults) │
                    └──────────────────────────┘
```

### Read Path

```
Consumer.get('voice.volume', guildId)
  → CacheProvider.get('{guildId}:voice.volume')
      hit → return
      miss → DatabaseConfigProvider.get('voice.volume', guildId)
          has row → cache it → return
          no row → DefaultConfigProvider.get('voice.volume')
              → manifest defaultValue → cache it → return
```

### Write Path

```
API PUT /api/v1/guilds/:id/settings/:key
  → Validate (Zod schema from SettingsRegistry)
  → DatabaseConfigProvider.set(key, value, { guildId, changedBy })
      BEGIN → SELECT FOR UPDATE → validate → UPDATE → INSERT audit → COMMIT
  → CacheProvider.del('{guildId}:{key}')
  → EventBus.publish('config.setting.changed', event)
      → Module.onConfigChange()
      → WebSocket push to dashboard
  → 200 OK
```

### Key Design Decisions

- **No polling.** Events propagate changes throughout the system.
- **Cache TTL safety net.** 30s default TTL ensures stale cache eventually resolves.
- **Audit trail.** Every write is logged with before/after values.
- **Per-guild isolation.** Guild-scoped cache keys prevent cross-guild leaks.

---

## 6. Dashboard Architecture

Dashboard is a standalone SPA. Zero bot code imports. Communicates only through the REST API.

### Component Tree

```
App
├── AuthGuard
├── Layout
│   ├── Sidebar (generated from GET /api/v1/modules)
│   ├── Topbar (breadcrumb, search/command palette, user menu)
│   └── Main
│       ├── HomePage
│       │   └── ModuleCardGrid (rendered from manifest data)
│       ├── ModuleSettingsPage (GENERIC — works for ANY module)
│       │   ├── ModuleHeader (name, description, icon from manifest)
│       │   ├── ModuleStatus (enable/disable toggle)
│       │   ├── SettingsGroup (grouped by category)
│       │   │   └── SettingControl (rendered by type)
│       │   └── SaveIndicator
│       └── PermissionPage (GENERIC)
│           └── PermissionMatrix (action × role from registry)
└── Shared (PermissionsGuard, LoadingState, ErrorBoundary, Toast)
```

### Dashboard NEVER knows:

- Module names (voice, welcome, goodbye, logging, moderation)
- Setting keys (standby_channel, volume, prefix)
- Setting types (beyond the SettingType union)
- Module categories or groups

### Data Flow

```
Page mounts → parallel API calls:
  GET /api/v1/guilds → user's guilds
  GET /api/v1/guilds/:id/modules → enabled modules
  GET /api/v1/modules/:id → manifest
  GET /api/v1/modules/:id/settings → setting metadata
  GET /api/v1/guilds/:id/settings → current values

User changes setting:
  PUT /api/v1/guilds/:id/settings/:key → optimistic update → API response → confirm
```

---

## 7. API Layer

### Server Architecture

- Embedded Express/Fastify in bot process
- Starts after all modules initialized
- Routes populated from IAPIRegistry
- Graceful shutdown via bot lifecycle
- Configurable port via `API_PORT`

### Middleware Stack

```
Request → Auth → Rate Limit → Validation → Handler → Response
```

### Endpoint Categories

| Category | Base Path | Auth |
|----------|-----------|------|
| Auth | `/api/v1/auth/*` | Public / Authenticated |
| Guilds | `/api/v1/guilds/*` | Authenticated / guild_member |
| Modules | `/api/v1/modules/*` | Public |
| System | `/api/v1/system/*` | Public / bot_owner |
| WebSocket | `/api/v1/ws` | Authenticated (via session cookie) |

### Module Endpoint Registration

```typescript
// voice/voice.api.ts
export const voiceAPI: IAPIEndpoint[] = [
  {
    module: 'hoak:voice',
    method: 'PUT',
    path: '/guilds/:guildId/settings/voice/:key',
    handler: updateVoiceSetting,
    auth: 'guild_admin',
    params: z.object({ guildId: z.string(), key: z.string() }),
    body: z.object({ value: z.unknown() }),
  },
];
```

---

## 8. Data Flow

### Configuration Change

```
Dashboard PUT → API Server → ConfigProvider.set()
  → Database write (transactional)
  → Cache invalidation
  → ConfigChangedEvent
  → Module.onConfigChange()
  → WebSocket push
  → Dashboard updates
```

### Module Communication

```
VoiceModule detects voice join
  → publishes 'voice.member.joined' on EventBus
  → MetricsModule subscribes → increments counter
  → LoggingModule subscribes → writes to audit_log
  → [No dashboard involvement — bot-internal flow]
```

### Dashboard Load

```
Browser navigates to /dashboard/{guildId}/voice
  → Auth middleware validates session
  → Layout loads (sidebar from GET /api/v1/modules)
  → Module settings page renders:
      1. GET /api/v1/modules/voice → manifest
      2. GET /api/v1/modules/voice/settings → setting metadata
      3. GET /api/v1/guilds/{guildId}/settings → current values
      4. DynamicSettingsRenderer maps metadata + values → controls
```

---

## 9. Module Lifecycle

```
Application Bootstrap
  │
  ▼
Core services initialize (DI Container, Logger, Cache, Database)
  │
  ▼
MigrationRunner.run() — apply pending DB migrations
  │
  ▼
ModuleLoader.load()
  ├── 1. DependencyGraph.validate() — hard fail on errors
  ├── 2. For each module (dependency-first):
  │       ├── onPreRegister()
  │       ├── onRegister() → registries: settings, permissions, commands, API
  │       └── onPostRegister()
  └── 3. For each module (dependency-first):
          ├── onPreStart()
          ├── onStart()
          └── onPostStart()
  │
  ▼
API Server starts (routes from IAPIRegistry)
  │
  ▼
Discord client connects
  │
  ▼
RUNNING STATE
  ├── Commands → modules
  ├── Events → EventBus → modules
  ├── API requests → handlers
  └── Config changes → events → modules → WebSocket
  │
  ▼
SIGTERM received
  ├── API server stops accepting connections
  ├── Discord client disconnects
  ├── For each module (reverse dependency order):
  │       onPreStop() → onStop() → onPostStop()
  ├── Database connections close
  └── Process exits
```

---

## 10. Documentation Structure

```
docs/
├── README.md                     # Documentation index
├── architecture/
│   ├── OVERVIEW.md               # This document
│   ├── adr/                      # Architecture Decision Records
│   │   ├── ADR-001-module-manifest.md
│   │   ├── ADR-002-settings-metadata.md
│   │   ├── ADR-003-config-provider.md
│   │   ├── ADR-004-permission-model.md
│   │   ├── ADR-005-api-convention.md
│   │   ├── ADR-006-database-config.md
│   │   ├── ADR-007-plugin-system.md
│   │   ├── ADR-008-dashboard-architecture.md
│   │   ├── ADR-009-event-convention.md
│   │   └── ADR-010-config-lifecycle.md
│   └── specifications/           # Detailed specifications
│       ├── manifests.md
│       ├── settings.md
│       ├── permissions.md
│       ├── api-convention.md
│       ├── validation.md
│       └── migration-strategy.md
├── modules/
│   └── module-guide.md
├── deployment/
│   └── pm2.md
└── api/
    └── event-catalog.md
```

---

## Related Documents

- [ROADMAP.md](./ROADMAP.md) — Milestone-by-milestone implementation plan
- [ADR-001](./docs/architecture/adr/ADR-001-module-manifest.md) — Module Manifest Schema
- [ADR-002](./docs/architecture/adr/ADR-002-settings-metadata.md) — Settings Metadata
- [ADR-003](./docs/architecture/adr/ADR-003-config-provider.md) — Config Provider Interface
- [ADR-004](./docs/architecture/adr/ADR-004-permission-model.md) — Permission Model
- [ADR-005](./docs/architecture/adr/ADR-005-api-convention.md) — API Convention
- [ADR-006](./docs/architecture/adr/ADR-006-database-config.md) — Database Config Schema
- [ADR-007](./docs/architecture/adr/ADR-007-plugin-system.md) — Plugin System
- [ADR-008](./docs/architecture/adr/ADR-008-dashboard-architecture.md) — Dashboard Architecture
- [ADR-009](./docs/architecture/adr/ADR-009-event-convention.md) — Event Convention
- [ADR-010](./docs/architecture/adr/ADR-010-config-lifecycle.md) — Configuration Lifecycle
