# Hoak Bot v3.0 Roadmap — Configuration Platform

**Version:** 3.0  
**Status:** Architecture Approved  
**Target Node:** 22 LTS  
**Target Discord.js:** v14  
**Database:** Supabase PostgreSQL  
**Style:** Single-repo monolith with manifest-driven modules

---

## Architecture Summary

### v2 → v3 Improvements

| v2 Limitation | v3 Solution |
|---------------|-------------|
| Settings hardcoded in `bot.json` `config/types.ts` | Settings defined per-module via `ISettingMetadata`, aggregated by `SettingsRegistry` |
| Modules manually imported in `bootstrap.ts` | Build-time manifest index + dependency graph resolution |
| Single lifecycle (register → start → shutdown) | Full lifecycle: 10 hooks across pre-register → post-stop |
| All events in one file (`core/event-bus/events.ts`) | Module-owned events, infrastructure events only in core |
| Permission system: role names → numeric levels | Action-based: `voice:configure`, `moderation:ban` with role/user overrides |
| No REST API | Embedded API server with full CRUD, OAuth2, rate limiting |
| No dashboard | Metadata-driven SPA — no switch/if per module |
| No cache implementation | MemoryCacheProvider with TTL + cache warming |
| No configuration change propagation | `config:changed` event → cache invalidation → module `onConfigChange()` → WebSocket push |
| No audit trail for config changes | `config_audit_log` table — every change is timestamped and actor-stamped |

---

## Architecture Principles

### P1 — Platform over Product

The platform's contracts (IConfigProvider, IModuleManifest, ISettingsRegistry, IAPIRegistry) are the product. The dashboard is one client. The bot is one client. Future clients are welcome.

### P2 — Metadata over Code

Every module declares its structure as data. Manifest, settings, permissions, and API endpoints are data objects. The dashboard renders from metadata. No switch(module), no if(module==="voice"), no hardcoded pages.

### P3 — Registry over Discovery

Canonical registries exist for every concern: ModuleRegistry, SettingsRegistry, PermissionRegistry, APIRegistry. Registries are populated at module registration time. Consumers query registries.

### P4 — Explicit over Implicit

Every module declares dependencies, settings, permissions, API endpoints, events, and feature flags in its manifest. No runtime directory scanning. No magic.

### P5 — Forward-Only Dependencies

Milestone N depends on Milestone N-1. No milestone requires rewriting a previous milestone. If a later milestone reveals a flaw, the fix is an additive extension — never a breaking interface change.

### P6 — Schema-First Validation

Every data structure that crosses a boundary has a Zod schema. Config files, settings values, API payloads, manifest declarations — invalid data is rejected at the boundary.

### P7 — Zero Polling

Configuration changes propagate via events. Cache is invalidated on write. Modules react via `onConfigChange()`. Dashboard updates via WebSocket. No polling anywhere in the system.

---

## Dependency Graph

```
Milestone 1: Architecture Foundation (ADRs + Specs)
    │
    ▼
Milestone 2: Core Configuration Infrastructure
    │               ────────────────────────────────
    ▼               │                              │
Milestone 3:     Milestone 5:                    Milestone 6:
Database Config  Permission + Event Redesign      API Layer
    │               │                              │
    ▼               │                              │
Milestone 4:       │                              │
Plugin System v2  ◄┘                              │
    │                                              │
    ▼                                              ▼
Milestone 7: Dashboard Frontend (consumes API + registries)
    │
    ▼
Milestone 8: Live Configuration + Polish

Key dependencies:
  Milestone 2 ← Milestone 3, 4, 5, 6, 7, 8 (all depend on settings + config infra)
  Milestone 3 ← Milestone 4 (DB provider needs settings registry)
  Milestone 5 ← Milestone 4 (full lifecycle needs plugin system)
  Milestone 6 ← Milestone 4, 5 (API needs registries)
  Milestone 7 ← Milestone 6 (dashboard needs API)
  Milestone 8 ← All previous (live config needs everything)
```

**Arrow = "depends on"**  
Every milestone depends on all milestones above it in the graph. No milestone depends on a milestone below it.

---

## Milestone 1: Architecture Foundation

**Goal:** Establish the architectural contracts before any code is written. Every subsequent milestone references these documents.

**Effort:** 2-3 days  
**Depends on:** Nothing  
**Risk:** Low  

### Deliverables

| # | Artifact | Description |
|---|----------|-------------|
| 1 | ADR-001 → ADR-010 | 10 Architecture Decision Records (created in `docs/architecture/adr/`) |
| 2 | Specifications | 6 specification documents in `docs/architecture/specifications/` |
| 3 | Directory structure | Create `docs/architecture/`, `docs/modules/`, `docs/deployment/`, `docs/api/` directories |
| 4 | Type-only definitions | TypeScript interfaces for all contracts (no runtime code) |

### ADR Index

| ADR | Title | Defines |
|-----|-------|---------|
| 001 | Module Manifest Schema | IModuleManifest, ModuleCategory, DashboardConfig |
| 002 | Settings Metadata & Registry | ISettingMetadata, SettingType, ISettingsRegistry |
| 003 | Configuration Provider Interface | IConfigProvider, ConfigChangeEvent, ConfigSetOptions |
| 004 | Permission Model | IPermissionAction, PermissionLevel, IPermissionService |
| 005 | API Convention & REST Design | IAPIEndpoint, APIAuthLevel, URL structure, response format |
| 006 | Database Configuration Schema | guild_settings, config_audit_log, module_states tables |
| 007 | Plugin System & Module Loading | IModule (v3), IModuleContext, IDependencyGraph |
| 008 | Dashboard Architecture | Component tree, data flow, zero-coupling contract |
| 009 | Event Naming Convention & Ownership | Naming rules, module-owned events, core events |
| 010 | Configuration Change Lifecycle | Full write path, cache invalidation, concurrency |

### Acceptance Criteria

- All 10 ADRs exist in `docs/architecture/adr/`
- All 6 specification documents exist in `docs/architecture/specifications/`
- Type-only definitions compile with `tsc --noEmit`
- No runtime code is written

---

## Milestone 2: Core Configuration Infrastructure

**Goal:** Build the configuration platform — config provider, settings registry, cache layer, and module manifests for existing modules.

**Effort:** 5-7 days  
**Depends on:** Milestone 1  
**Risk:** Medium (high-touch changes to existing services)

### Deliverables

#### 2.1 Config Provider
- `IConfigProvider` interface (from ADR-003)
- `JsonConfigProvider` — reads `config/bot.json`, merges `.env`, validates with Zod
- Replace `ConfigService` with the new provider in the DI container
- Migrate every existing service from direct config access to `configProvider.get()`

#### 2.2 Settings Registry
- `ISettingMetadata` types and `SettingType` discriminated union
- `ISettingsRegistry` implementation with key collision detection
- Zod validation integration (per-setting validation schemas)

#### 2.3 Cache Layer
- `ICacheProvider` interface
- `MemoryCacheProvider` (Map-based, TTL support)
- Cache key convention: `{guildId}:{settingKey}` for guild-scoped, `{settingKey}` for global
- Cache warming on startup

#### 2.4 Module Manifest Foundations
- `IModuleManifest` types and Zod validation
- Declare manifests for ALL existing modules:
  - `voice/voice.manifest.ts`
  - `moderation/moderation.manifest.ts`
  - `logging/logging.manifest.ts`
  - `welcome/welcome.manifest.ts`
  - `goodbye/goodbye.manifest.ts`
  - `general/general.manifest.ts`
  - `metrics/metrics.manifest.ts`
- Each manifest includes: settings metadata, permission actions, command list, event list
- Build-time manifest index generator script

#### 2.5 Module Directory Structure Update

```
modules/voice/
├── voice.module.ts        # IModule implementation
├── voice.manifest.ts      # IModuleManifest export ★
├── voice.settings.ts      # ISettingMetadata[] export ★
├── voice.api.ts           # IAPIEndpoint[] export (optional, Milestone 6) ★
├── voice.permissions.ts   # IPermissionAction[] export ★
├── commands/
├── events/
├── services/
├── repositories/
└── types.ts               # Includes module-owned event types ★

modules/_template/         # Updated template with all new files ★
```

### Acceptance Criteria

- All services use `IConfigProvider` via constructor injection
- Zero direct `bot.json` imports outside the config provider
- Settings registry rejects duplicate keys
- Cache stores/retrieves/invalidates correctly
- All 7 existing modules have valid manifests
- `npm run build && npm run typecheck && npm run lint && npm test` passes

### Migration: Service Config Access

| Current Pattern | New Pattern |
|----------------|-------------|
| `this.config.voice.volume` | `await this.configProvider.get('voice.volume', guildId)` |
| `appConfig.bot.logging.channelId` | `await this.configProvider.get('logging.voice.channelId', guildId)` |
| `this.config.bot.prefix` | `await this.configProvider.get('general.prefix', guildId)` |

---

## Milestone 3: Database Configuration

**Goal:** Store per-guild settings in PostgreSQL. Implement the fallback chain: cache → database → defaults.

**Effort:** 4-5 days  
**Depends on:** Milestone 2  
**Risk:** Low-Medium

### Deliverables

#### 3.1 Database Tables

```sql
CREATE TABLE guild_settings (...);
CREATE TABLE config_audit_log (...);
CREATE TABLE module_states (...);
```

#### 3.2 DatabaseConfigProvider
- Implements `IConfigProvider`
- Reads/writes `guild_settings` table
- Falls back to `JsonConfigProvider` defaults when no row exists
- Writes invalidate cache via `CacheProvider.del()`
- Optimistic locking via `version` column

#### 3.3 Migration Runner
- `IMigration` interface with `up()` / `down()`
- Migration runner executes pending migrations on startup
- `_migrations` tracking table
- Core migrations in `src/core/database/migrations/`

#### 3.4 Default Seeding
- On guild join event: seed default settings for all enabled modules
- Manifest `defaultValue` is the source of truth for defaults
- Existing guilds: seed on first config read (lazy initialization)

#### 3.5 Feature Flags V2
- Per-guild module enable/disable via `module_states` table
- Global overrides via `config/feature-flags.json`
- Feature flag keys defined in module manifests

### Acceptance Criteria

- New database tables created via migration
- Fallback chain: cache hit → return, cache miss → DB → return, no DB row → defaults → return
- Settings writes update DB → invalidate cache → return new value
- Migration runner applies pending migrations on startup
- Multiple guilds have independent settings
- Per-guild module enable/disable works
- All existing features work with the new chain

---

## Milestone 4: Plugin System v2

**Goal:** Manifest-aware module loading with dependency resolution, full lifecycle hooks, and module registry.

**Effort:** 4-5 days  
**Depends on:** Milestones 2, 3  
**Risk:** Medium

### Deliverables

#### 4.1 Module Interface (v3)

Replace the v2 `IModule` with the full lifecycle interface:

```typescript
interface IModule {
  readonly manifest: IModuleManifest;
  onPreRegister?(ctx: IModuleContext): Promise<void>;
  onRegister?(ctx: IModuleContext): Promise<void>;
  onPostRegister?(ctx: IModuleContext): Promise<void>;
  onPreStart?(ctx: IModuleContext): Promise<void>;
  onStart?(ctx: IModuleContext): Promise<void>;
  onPostStart?(ctx: IModuleContext): Promise<void>;
  onConfigChange?(changes: ConfigChangeEvent[], ctx: IModuleContext): Promise<void>;
  onPreStop?(ctx: IModuleContext): Promise<void>;
  onStop?(ctx: IModuleContext): Promise<void>;
  onPostStop?(ctx: IModuleContext): Promise<void>;
}
```

#### 4.2 Dependency Graph
- `IDependencyGraph` with topological sort
- Circular dependency detection with path reporting
- Missing dependency detection
- Version compatibility checking (SemVer ranges in v4+)

#### 4.3 Module Registry
- `IModuleRegistry` — register, unregister, get, getAll, isEnabled
- Module state (enabled/disabled) per guild from `module_states` table

#### 4.4 Module Loader (v3)
- Manifest validation before any module code runs
- Dependency-order loading
- Full lifecycle execution with error isolation
- Build-time manifest index (`src/modules/module-index.ts`)

#### 4.5 Update Existing Modules
- Adapt all existing modules to the v3 `IModule` interface
- Add no-op implementations for new lifecycle hooks
- Move event type definitions from core to module directories

### Registration Order (enforced)

```
1. DependencyGraph.validate() — hard fail on circular/missing
2. For each module (dependency-first):
     onPreRegister → onRegister → onPostRegister
3. For each module (dependency-first):
     onPreStart → onStart → onPostStart
4. Bot is ready
```

### Acceptance Criteria

- Dependency resolution rejects circular dependencies with clear error + cycle path
- Modules load in dependency order
- All lifecycle hooks execute in correct order
- Error in one module's hook does not prevent other modules from loading
- Module manifest index is generated at build time
- All existing modules work with the v3 interface

---

## Milestone 5: Permission & Event System Redesign

**Goal:** Action-based permission system, module-owned events, configuration audit trail.

**Effort:** 3-4 days  
**Depends on:** Milestone 4  
**Risk:** Low

### Deliverables

#### 5.1 Permission Registry
- `IPermissionService` and `IPermissionRegistry` implementations
- `permission_overrides` database table
- Permission resolution with role/user overrides
- Default level mapping (everyone → owner)

#### 5.2 Event Convention Migration
- Move module event types from `core/event-bus/events.ts` to each module's `types.ts`
- Core events remain: `bot.ready`, `bot.error`, `config.setting.changed`, `system.shutdown`
- Apply new naming convention: `voice.member.joined`, `moderation.action.executed`
- Deprecate old event names with backward-compatible aliases

#### 5.3 Configuration Events
- `ConfigChangedEvent` type published on every settings write
- Event payload includes: key, oldValue, newValue, guildId, changedBy, source, timestamp
- Modules subscribe to react to config changes

#### 5.4 Audit Trail
- `config_audit_log` table populated on every config write
- API endpoint: `GET /api/v1/guilds/:id/audit?page=1`
- Dashboard renders audit table from this endpoint

#### 5.5 Permission-Aware API
- `PermissionService.check()` integrated with API auth middleware
- `/api/v1/guilds/:id/permissions` endpoints for dashboard

### Acceptance Criteria

- Permission resolution works for all 5 levels
- Role and user overrides stored in DB and respected
- Events follow the new naming convention
- Core events.ts no longer contains module events
- Config audit trail records every change
- API permission checks are functional

---

## Milestone 6: API Layer

**Goal:** Implement the REST API server with auth, rate limiting, and all CRUD endpoints. Modules register their API endpoints.

**Effort:** 4-5 days  
**Depends on:** Milestones 4, 5  
**Risk:** Medium

### Deliverables

#### 6.1 API Server
- Embedded Express or Fastify server in the bot process
- Server starts after all modules initialized
- Graceful shutdown integrated with bot lifecycle
- CORS locked to dashboard origin
- Configurable port via `API_PORT` env var

#### 6.2 Middleware Chain
- Auth middleware (session cookie validation)
- Rate limit middleware (per-user, per-guild, per-IP)
- Validation middleware (Zod schema per endpoint)
- Response formatter (standard envelope)

#### 6.3 Core Routes

| Endpoint | Purpose |
|----------|---------|
| `GET /api/v1/auth/*` | OAuth2 login/callback/logout/session |
| `GET /api/v1/guilds` | List user's guilds |
| `GET /api/v1/guilds/:id/settings` | Read guild settings |
| `PUT /api/v1/guilds/:id/settings/:key` | Update one setting |
| `GET /api/v1/modules` | All module manifests |
| `GET /api/v1/modules/:id/settings` | Setting metadata |
| `GET /api/v1/system/*` | Health, version, metrics |

#### 6.4 Module API Registration
- Modules declare endpoints in `<name>.api.ts`
- `IAPIRegistry.register()` during `onRegister()`
- Route collision detection at registration time

#### 6.5 API Convention Enforcement
- Standard response envelope wrapper
- Unified error handling
- Pagination helper
- Rate limit headers

### Acceptance Criteria

- API server starts and responds on configured port
- Discord OAuth2 login flow works end-to-end
- Settings CRUD reads/writes through ConfigProvider chain
- Module metadata endpoints return correct data from registries
- Rate limiting prevents abuse
- Module API endpoints register without collisions
- All endpoints use standard response envelope

---

## Milestone 7: Dashboard Frontend

**Goal:** Metadata-driven dashboard SPA. No hardcoded pages. No switch(module). No if(module).

**Effort:** 5-7 days  
**Depends on:** Milestone 6  
**Risk:** Medium

### Deliverables

#### 7.1 Application Shell
- React + Vite + Tailwind CSS SPA
- Discord OAuth2 login flow
- Guild selector page
- Sidebar generated from `/api/v1/modules` manifest data
- Responsive layout (mobile-friendly)

#### 7.2 Component Architecture

```
App
├── AuthGuard
├── Layout
│   ├── Sidebar (generated from module manifests)
│   │   ├── GuildSelector
│   │   └── NavSection (per category)
│   │       └── NavItem (icon + name from manifest)
│   ├── Topbar (Breadcrumb + Search + UserMenu)
│   └── Main Content
│       ├── HomePage
│       │   └── ModuleCardGrid (from manifest data)
│       ├── ModuleSettingsPage (GENERIC — no module-specific code)
│       │   ├── ModuleHeader (manifest data)
│       │   ├── ModuleStatus (enable/disable toggle)
│       │   ├── SettingsGroup (grouped by category)
│       │   │   └── SettingControl (rendered by type)
│       │   └── SaveIndicator
│       └── PermissionPage (GENERIC)
│           └── PermissionMatrix (action × role)
```

#### 7.3 Dynamic Settings Renderer
Controls rendered by `SettingType`:

| Type | Component |
|------|-----------|
| `string` | TextInput |
| `text` | Textarea |
| `number` | NumberInput / Slider |
| `boolean` | Toggle |
| `select` | Select |
| `multiSelect` | MultiSelect |
| `channel` | ChannelPicker |
| `role` | RolePicker |
| `user` | UserPicker |
| `color` | ColorPicker |
| `duration` | DurationControl |
| `image` | ImageInput (URL + preview) |
| `json` | JSONEditor |
| `template` | TemplateEditor (with placeholder preview) |

#### 7.4 State Management
- API client with typed responses
- React Query or SWR for server state
- Optimistic updates for settings saves
- Toast notifications for success/error

#### 7.5 UI Components
- Button, Input, Select, Toggle, Card, Modal, Toast
- Search (filters modules + settings)
- Breadcrumb
- Command Palette (`Ctrl+K`)
- Permission Guard (hide/show controls based on user permissions)
- Loading states + Error boundaries

### Acceptance Criteria

- User logs in via Discord OAuth2
- User selects a guild → sidebar shows enabled modules
- Each module page is fully generated from metadata
- Changing a setting saves and reflects immediately
- Validation errors show inline
- Non-admin users see read-only state
- New module appears in sidebar without any code changes
- No hardcoded module references anywhere in the codebase

### Zero-Coupling Guarantee

The dashboard codebase must contain:
- Zero references to "voice", "welcome", "goodbye", "logging", "moderation"
- Zero switch/if statements checking module names
- Zero hardcoded setting keys or setting types
- The `SettingType` union is the ONLY shared type contract

---

## Milestone 8: Live Configuration & Polish

**Goal:** Settings changes propagate instantly without bot restart. WebSocket push, module hot-reload, document finalized architecture.

**Effort:** 3-4 days  
**Depends on:** All previous milestones  
**Risk:** Low-Medium

### Deliverables

#### 8.1 Module Hot-Reload
- Implement `onConfigChange()` in each module that supports it:
  - VoiceModule: volume → AudioManager, channel → standby target
  - WelcomeModule: channel → target, message → template update
  - LoggingModule: channel → log target, enabled → toggle
  - ModerationModule: (restart required for permission changes)
- Modules without hot-reload show "Restart required" badge in dashboard

#### 8.2 WebSocket Support
- WebSocket endpoint at `/api/v1/ws`
- Client authenticates and subscribes to guild config changes
- Server pushes `config.setting.changed` events to subscribed clients
- Dashboard updates in real-time when another admin changes settings
- WebSocket is optional — REST polling is the fallback

#### 8.3 Configuration History UI
- Dashboard audit log page: `GET /api/v1/guilds/:id/audit`
- Table shows: setting, old value, new value, changed by, timestamp
- Filter by module, setting, user, date range

#### 8.4 Final Migration
- Remove deprecated `ConfigService` (fully replaced by `IConfigProvider`)
- Remove any remaining direct `bot.json` references
- Deprecate `config/bot.json` as primary config (keep as bootstrap defaults only)
- Archive v2 `module.interface.ts`

#### 8.5 Testing & Documentation
- Integration tests for the entire write → cache invalidation → module reaction → WebSocket push path
- API end-to-end tests
- Dashboard component tests (render every SettingType)
- Finalize all documentation
- Update README.md, CONTRIBUTING.md, ARCHITECTURE.md

### Acceptance Criteria

- Changing a setting via API → cache invalidates → bot reads new value immediately
- WebSocket pushes config change events to connected dashboard clients
- Bot does not need restarting for (non-restart-required) settings
- Module `onConfigChange()` fires with correct payload for supported modules
- Audit log records every configuration change
- Full test suite passes
- All deprecated code paths are removed

---

## Risks

| # | Risk | L | I | Mitigation |
|---|------|---|----|-----------|
| 1 | Milestone 2 service migration touches every file. High regression risk. | H | H | Integration tests before/after each service migration. Migrate one service at a time. |
| 2 | Module manifest drift — metadata may not match actual module capabilities. | M | M | Build-time validation script (`validate-manifests`) checks declared vs actual commands, settings, events. |
| 3 | API server shares bot's event loop. Heavy API requests could delay Discord handlers. | M | M | All handlers are lightweight (cache reads, DB writes). If needed, offload to a worker thread. |
| 4 | Cache invalidation bugs cause stale settings. | M | H | Tests for write → cache invalidate → read returns new value. TTL fallback (30s) as safety net. |
| 5 | Dashboard SPA grows without module coupling discipline. | M | M | Code review enforces zero module-name references. CI check fails if any module name string appears. |
| 6 | Motivation wanes across 8 milestones (~8-10 weeks). | H | M | Each milestone delivers working value. Milestone 2 alone eliminates major tech debt. Milestone 4 makes modules self-describing. |
| 7 | Per-guild config adds complexity to a single-guild bot. | L | L | Single-guild optimization can bypass guild-scoped cache keys. Architecture supports both. |

---

## Future-Proofing

### v4 — Third-Party Modules

No architecture changes needed. The manifest system, dependency graph, lifecycle hooks, and API registry already support external modules. Add:
- `node_modules/hoak-module-*` scanning
- Module SDK package (`@hoak/sdk`)
- Sandboxed execution (resource limits, error isolation)

### v5 — Multi-Instance

No architecture changes needed. `ICacheProvider` is interface-based — swap `MemoryCacheProvider` for `RedisCacheProvider`. Events already flow through EventBus (which can be backed by Redis pub/sub). Config is already in the database.

### v6 — Advanced Modules

No architecture changes needed. Economy, Tickets, AI, Reaction Roles, Leveling, Starboard — all follow the same manifest-driven pattern. Zero dashboard changes for new modules.

---

## v2 → v3 Migration Checklist

### Pre-Migration
- [ ] Verify all 338+ tests pass on v2 baseline
- [ ] Create `next` branch for v3 development
- [ ] Tag current v2 state as `v2.0.0`
- [ ] Archive current `ROADMAP.md` (preserved as `ROADMAP-v2.md`)

### Milestone 2 Migration
- [ ] Create `IConfigProvider` interface
- [ ] Implement `JsonConfigProvider`
- [ ] Identify every file that reads `bot.json` or `config.*` directly
- [ ] Migrate each service: add `IConfigProvider` to constructor, replace direct reads
- [ ] After each migration: `npm run build && npm run typecheck && npm test`
- [ ] Create manifests for all 7 existing modules
- [ ] Verify no manifest key collisions

### Milestone 3 Migration
- [ ] Run migration scripts on Supabase
- [ ] Implement `DatabaseConfigProvider`
- [ ] Test fallback chain: cache → DB → defaults
- [ ] Seed initial guild settings on first run

### Milestone 4 Migration
- [ ] Update `IModule` interface to v3 (add lifecycle hooks)
- [ ] Adapt all modules to new interface with no-op hooks
- [ ] Create build-time manifest index generator
- [ ] Move event types to module directories

### Milestone 5 Migration
- [ ] Create `permission_overrides` table
- [ ] Migrate v2 role-level config to initial permission actions
- [ ] Rename events to new convention
- [ ] Add backward-compatible event aliases

### Milestone 7 Migration
- [ ] Dashboard SPA created in `dashboard/` directory
- [ ] No coupling between dashboard and bot code
- [ ] Verify all module settings render correctly
- [ ] No hardcoded module references in dashboard codebase

### Post-Migration
- [ ] Run full test suite and CI/CD pipeline
- [ ] Deploy to VPS
- [ ] Monitor logs for config-related errors
- [ ] Deprecate `bot.json` editing in documentation
- [ ] Update README.md, CONTRIBUTING.md, SECURITY.md
- [ ] Archive v2 module interface and bootstrap patterns

---

## Project Status

| Milestone | Status | Target | ADRs |
|-----------|--------|--------|------|
| 1. Architecture Foundation | **COMPLETE** | Day 1-3 | ADR-001 → ADR-010 ✓ |
| 2. Core Configuration | PENDING | Day 4-10 | — |
| 3. Database Configuration | PENDING | Day 11-15 | — |
| 4. Plugin System v2 | PENDING | Day 16-20 | — |
| 5. Permission & Events | PENDING | Day 21-24 | — |
| 6. API Layer | PENDING | Day 25-29 | — |
| 7. Dashboard Frontend | PENDING | Day 30-36 | — |
| 8. Live Config & Polish | PENDING | Day 37-40 | — |

**Total estimated effort:** ~8-10 weeks

> **This roadmap is a living document.** ADRs are the source of truth for architectural decisions. This roadmap is the guide for project planning.
