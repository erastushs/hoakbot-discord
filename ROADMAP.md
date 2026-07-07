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
| 2. Core Configuration | **COMPLETE** | Day 4-10 | Settings registry, module metadata, config providers, and live runtime configuration are implemented. |
| 3. Database Configuration | **COMPLETE** | Day 11-15 | PostgreSQL-backed guild settings, migrations, and JSON fallback are implemented. |
| 4. Plugin System v2 | **COMPLETE** | Day 16-20 | Module registry, module loader, manifests, feature flags, and lifecycle loading are implemented. |
| 5. Permission & Events | **PARTIAL / SUPERSEDED BY v3.1 AUTHORIZATION** | Day 21-24 | Runtime event/config flows exist; database permission override and config audit table items remain future work. |
| 6. API Layer | **COMPLETE** | Day 25-29 | Embedded API, standard envelopes, validation, dashboard module/settings endpoints, health endpoint, and protected settings APIs are implemented. |
| 7. Dashboard Frontend | **COMPLETE** | Day 30-36 | React dashboard, auth integration, guild switching, metadata-driven settings pages, and API client are implemented. |
| 8. Live Config & Polish | **PARTIAL** | Day 37-40 | REST-based live configuration is implemented; WebSocket push, audit history UI, and deprecated-code cleanup remain future work. |

**Total estimated effort:** ~8-10 weeks

> **This roadmap is a living document.** ADRs are the source of truth for architectural decisions. This roadmap is the guide for project planning.

---

# Hoak Bot v3.1 Roadmap - Dashboard Authentication, Authorization, Security, and Production Deployment

**Version:** 3.1  
**Status:** COMPLETE  
**Production Baseline:** v3.1 security-hardened dashboard/API  
**Primary Domain:** `https://dashboard.hoakfamily.web.id`  
**Scope:** Dashboard access control, protected dashboard APIs, security hardening, production readiness, production deployment  
**Non-Goal:** New dashboard features unrelated to secure access and production readiness

---

## v3.1 Objective

Version 3.1 makes the existing dashboard safe for production use.

Current implementation status: dashboard OAuth, server-side sessions, authorization, API protection, security hardening, production-readiness fixes, production deployment, and production validation are complete.

### v3.1 Completion Summary

- Discord OAuth Authentication
- Session Management
- Authorization
- Dashboard Authentication
- Protected API
- CSRF Protection
- Security Headers
- Rate Limiting
- Security Audit Logging
- Production Deployment
- Production Validation

By the end of v3.1, a user can securely access `https://dashboard.hoakfamily.web.id` using Discord OAuth, and only authorized users can manage guild settings.

The v3.0 platform is treated as stable production infrastructure. Version 3.1 is forward-only: every phase builds on completed work, every phase is independently shippable, and no phase depends on a later phase.

---

## v3.1 Scope Boundary

### Included

- Dashboard authentication using Discord OAuth.
- Dashboard authorization for dashboard, guild, module, and configuration access.
- Server-side session management.
- Protected dashboard API endpoints.
- Dashboard integration with real authentication state.
- Security hardening for OAuth, cookies, sessions, CSRF, redirects, rate limits, and audit logging. **Complete.**
- Production readiness fixes for session cleanup scheduling, production OAuth validation, production CORS, and trusted proxy client IP handling. **Complete.**
- Production deployment for `dashboard.hoakfamily.web.id`. **Complete.**
- Production validation, rollback, and manual QA checklists. **Complete.**

### Explicitly Excluded

- Live configuration push.
- WebSocket.
- Plugin marketplace.
- Dashboard analytics.
- Multi-user collaboration.
- Theme customization.
- Mobile support as a dedicated feature track.
- Notifications.

These exclusions are future-release concerns and must not be introduced into the v3.1 implementation plan.

---

## v3.1 Architecture Principles

### P1 - Production Stability First

The production bot remains stable. Authentication and authorization work must be isolated from unrelated bot behavior and must avoid broad rewrites of existing v3.0 systems.

### P2 - Server-Side Trust Boundary

The API server is the source of truth for authentication, authorization, session validation, permission checks, and audit decisions. The dashboard UI may hide or disable controls, but API middleware must enforce every rule.

### P3 - Forward-Only Milestones

Each phase must be shippable without depending on a future phase. Later phases may harden, extend, or integrate prior contracts, but may not require redesigning earlier contracts.

### P4 - Secure by Default

Cookie flags, session expiration, OAuth state validation, redirect validation, CSRF protection, and rate limiting are planned as first-class deliverables, not post-release cleanup.

### P5 - Least Privilege Authorization

Users receive only the permissions they can prove through Discord guild ownership, Discord guild permissions, or explicit owner override. Configuration writes require stronger authorization than dashboard visibility.

### P6 - Auditable Administration

Security-relevant events and configuration mutations must be attributable to a Discord user, guild, session, IP/user-agent context when available, and timestamp.

---

## v3.1 Dependency Graph

```
Phase 1: Authentication Foundation
    |
    v
Phase 2: Discord OAuth Provider
    |
    v
Phase 3: Session Management
    |
    +------------------------------+
    v                              v
Phase 4: Authorization          Phase 5: Dashboard Integration
    |                              |
    +--------------+---------------+
                   v
Phase 6: API Protection
    |
    v
Phase 7: Security Hardening
    |
    v
Phase 8: Production Deployment
    |
    v
Phase 9: Production Validation
```

**Key dependencies:**

- Phase 2 depends on Phase 1 because Discord OAuth must implement stable authentication provider contracts.
- Phase 3 depends on Phase 2 because sessions are created from validated OAuth identities.
- Phase 4 depends on Phase 3 because authorization decisions require an authenticated session identity.
- Phase 5 depends on Phase 3 because the dashboard can integrate login, logout, and profile once session APIs exist.
- Phase 6 depends on Phases 4 and 5 because every dashboard API must enforce server-side permissions and support real UI flows.
- Phase 7 depends on Phase 6 because hardening applies to the completed auth and API surface.
- Phase 8 depends on Phase 7 because deployment must expose the hardened surface, not an incomplete auth stack.
- Phase 9 depends on Phase 8 because validation must run against the deployed production topology.

**Arrow = depends on.** No phase depends on a phase below it.

---

## Phase 1: Authentication Foundation

**Current Status:** COMPLETE  
**Completion Summary:** Authentication, session, user identity, request context, and auth error contracts are implemented and used by the dashboard API stack.

**Goal:** Define the stable authentication contracts needed by the API server and dashboard without committing to Discord-specific implementation details.

**Depends on:** v3.0.3 production baseline  
**Shippable Value:** The codebase has a clear auth boundary and can safely accept one or more auth providers later.  
**Risk:** Low-Medium

### Deliverables

- Authentication identity contract for a logged-in dashboard user.
- Authentication provider contract for login URL generation, callback handling, token exchange, and identity resolution.
- Session abstraction contract for create, read, rotate, revoke, and expire operations.
- Request auth context contract used by middleware and API handlers.
- Auth error taxonomy for unauthenticated, expired session, invalid OAuth state, forbidden, and insufficient guild permission cases.
- Configuration contract for dashboard auth settings such as public dashboard URL, OAuth callback URL, allowed redirect paths, and session cookie settings.

### Dependencies

- Existing REST API platform.
- Existing dashboard platform.
- Existing configuration service and environment configuration loading.

### Completion Criteria

- Auth interfaces and contracts are documented and ready for implementation.
- Contracts distinguish authentication from authorization.
- No Discord guild permission logic is embedded in the foundation layer.
- No dashboard UI behavior depends on unimplemented provider details.
- Existing production bot behavior remains unchanged.

### Validation Steps

- Review the contract boundaries before implementation starts.
- Verify every later phase can depend on these contracts without requiring contract rewrites.
- Confirm configuration names and required environment variables are known before Phase 2.

---

## Phase 2: Discord OAuth Provider

**Current Status:** COMPLETE  
**Completion Summary:** Discord OAuth login and callback routes are implemented with random expiring state, single-use replay protection, user/guild identity resolution, and production validation for required OAuth environment variables.

**Goal:** Implement Discord OAuth as the first authentication provider using the Phase 1 provider contract.

**Depends on:** Phase 1  
**Shippable Value:** Users can authenticate with Discord and the server can obtain a trustworthy Discord identity.  
**Risk:** Medium

### Deliverables

- Discord OAuth login route that generates a Discord authorization URL.
- Discord OAuth callback route.
- Authorization code token exchange.
- Discord user identity fetch.
- OAuth state generation, storage, validation, and single-use consumption.
- OAuth error handling for denied consent, invalid code, expired state, token exchange failure, and identity fetch failure.
- Redirect validation that permits only approved dashboard paths after login.
- Minimal authenticated identity payload containing Discord user ID, username/display name, avatar metadata, and provider name.

### Dependencies

- Discord application OAuth client ID and client secret.
- Registered callback URL for `https://dashboard.hoakfamily.web.id`.
- Dashboard public origin configuration.

### Completion Criteria

- Login redirects to Discord with correct scopes.
- Callback rejects missing, expired, reused, or mismatched OAuth state.
- Callback exchanges a valid code for tokens and resolves the Discord user identity.
- Server never exposes OAuth client secret or provider tokens to the dashboard client.
- Login flow has deterministic behavior for success and failure redirects.

### Validation Steps

- Manually test successful Discord login in a non-production environment.
- Manually test denied consent.
- Manually test tampered `state`.
- Manually test invalid callback code.
- Verify redirect attempts to external domains are rejected.

---

## Phase 3: Session Management

**Current Status:** COMPLETE  
**Completion Summary:** Server-side PostgreSQL sessions, opaque HttpOnly cookies, expiration, revocation, logout invalidation, current-session bootstrap, CSRF metadata integration, and scheduled cleanup are implemented.

**Goal:** Persist authenticated dashboard access using secure server-side sessions.

**Depends on:** Phase 2  
**Shippable Value:** Authenticated users can stay logged in securely without exposing provider tokens to the browser.  
**Risk:** Medium

### Deliverables

- Server-side session storage.
- Opaque session ID cookie.
- Session creation after successful Discord OAuth callback.
- Session lookup middleware that populates request auth context.
- Session expiration policy with absolute lifetime and idle timeout.
- Logout endpoint that revokes the server-side session and clears the cookie.
- Session rotation after login to prevent session fixation.
- Session cleanup strategy for expired sessions.
- Current session endpoint for dashboard bootstrapping.

### Dependencies

- Existing database infrastructure or another approved server-side storage mechanism.
- Cookie configuration values for domain, path, secure flag, HTTP-only flag, SameSite mode, and max age.

### Completion Criteria

- Sessions are stored server-side, not as self-contained client-side authorization tokens.
- Browser receives only an opaque session identifier.
- Logout invalidates the server-side session.
- Expired sessions are rejected consistently by middleware.
- Session rotation occurs after successful authentication.
- Session cookies are HTTP-only and ready for secure production flags.

### Validation Steps

- Login creates exactly one valid server-side session.
- Refreshing the dashboard preserves authentication while the session is valid.
- Logout prevents reuse of the old session cookie.
- Expired sessions return an unauthenticated response.
- Manually verify session cookie attributes in browser developer tools.

---

## Phase 4: Authorization

**Current Status:** COMPLETE  
**Completion Summary:** Server-side authorization supports guild owner, Administrator, Manage Guild, configured owner override, bot/user guild intersection, guild filtering, default-deny behavior, and IDOR protection for guild-scoped APIs.

**Goal:** Determine whether an authenticated Discord user may access the dashboard, a guild, a module, or a configuration action.

**Depends on:** Phase 3  
**Shippable Value:** The server can distinguish authenticated users from authorized administrators before exposing or mutating guild settings.  
**Risk:** High

### Authorization Model

Authorization must support these access levels:

- Dashboard access.
- Guild access.
- Module visibility.
- Configuration read.
- Configuration write.
- Administrative/security-sensitive operations.

Authorization must recognize these authority sources:

- Discord guild owner.
- Discord administrator permission.
- Discord manage guild permission.
- `OWNER_IDS` override for trusted bot owners/operators.

### Deliverables

- Authorization service contract and implementation.
- Guild membership and permission resolution strategy.
- Discord guild list integration for the authenticated user.
- Bot guild intersection check so users only manage guilds where the bot is present.
- Owner override check using configured `OWNER_IDS`.
- Permission decision result that includes allowed/denied, reason code, guild ID, user ID, and required capability.
- Authorization helpers for dashboard, guild, module, and configuration scopes.
- Clear default-deny behavior for missing guilds, missing permissions, Discord API failures, and unknown modules/settings.

### Dependencies

- Authenticated Discord user identity from Phase 3.
- Existing module registry and settings metadata.
- Existing bot guild state.
- Discord permission data from OAuth scopes and/or Discord API calls.

### Completion Criteria

- Unauthenticated users receive no authorization decisions beyond unauthenticated.
- Authenticated but unauthorized users cannot view or modify guild settings.
- Guild owners are authorized for their guilds.
- Users with Administrator are authorized for their guilds.
- Users with Manage Guild are authorized according to the chosen read/write policy.
- Configured `OWNER_IDS` users can access supported dashboard administration paths even when Discord guild permission data is insufficient.
- All authorization failures are explicit and auditable.

### Validation Steps

- Test a guild owner.
- Test a guild administrator who is not owner.
- Test a user with Manage Guild but not Administrator.
- Test a regular guild member.
- Test a user who shares no guild with the bot.
- Test a configured owner override user.
- Test Discord API failure behavior and confirm default-deny.

---

## Phase 5: Dashboard Integration

**Current Status:** COMPLETE  
**Completion Summary:** The dashboard uses real Discord OAuth login, server-side session bootstrap, logout, authenticated/unauthenticated states, authorized guild filtering, guild switching, and the protected API client.

**Goal:** Replace placeholder dashboard authentication with real session-aware Discord login, logout, profile, and guild selection flows.

**Depends on:** Phase 3  
**Shippable Value:** Users can access the existing dashboard through a real login flow and see only the guilds available to their session.  
**Risk:** Medium

### Deliverables

- Login page wired to the Discord OAuth login route.
- Auth callback handling path or loading state as required by the existing dashboard routing model.
- Session bootstrap on dashboard load.
- Logout action wired to the server logout endpoint.
- User profile display using Discord identity.
- Guild selector populated from authorized guild data.
- Authenticated and unauthenticated dashboard route guards.
- Permission-aware empty states for no authorized guilds and insufficient permissions.
- Removal of placeholder auth assumptions from dashboard behavior.

### Dependencies

- Session current-user endpoint from Phase 3.
- Guild authorization data from Phase 4 for final guild selector behavior.
- Existing dashboard UI shell and API client.

### Completion Criteria

- Anonymous users see the login entry point instead of the dashboard management UI.
- Logged-in users see their Discord profile identity.
- Logged-in users can log out and are returned to an unauthenticated state.
- Guild selector shows only guilds the API says the user may access.
- Dashboard does not rely on client-side-only permission decisions.
- Existing dashboard settings UI remains metadata-driven.

### Validation Steps

- Load dashboard while logged out.
- Complete login and confirm dashboard session bootstrap.
- Refresh the dashboard and confirm session persistence.
- Log out and confirm protected dashboard pages are inaccessible.
- Confirm a user with no authorized guilds receives a clear safe state.

---

## Phase 6: API Protection

**Current Status:** COMPLETE  
**Completion Summary:** Dashboard API routes are protected with session authentication, guild authorization, standard API envelopes, request validation, guild-scoped permission checks, and direct-call protection for settings APIs.

**Goal:** Protect every dashboard API endpoint with authentication middleware, authorization middleware, and session validation.

**Depends on:** Phases 4 and 5  
**Shippable Value:** Dashboard API access is secure even if the dashboard client is bypassed.  
**Risk:** High

### Deliverables

- Authentication middleware for all dashboard API routes.
- Authorization middleware for guild-scoped routes.
- Module authorization checks for module-scoped routes.
- Configuration read/write authorization checks for settings routes.
- Session validation on every protected request.
- Public route allowlist for login, callback, logout behavior where applicable, health checks, and static assets.
- Standard unauthenticated and forbidden API responses.
- Audit context propagation from session to configuration writes.
- Endpoint inventory documenting required auth level for each dashboard API endpoint.

### Dependencies

- Existing production API endpoints.
- Authorization service from Phase 4.
- Session middleware from Phase 3.
- Dashboard integration from Phase 5.

### Completion Criteria

- Every dashboard API endpoint is classified as public, authenticated, guild-authorized, module-authorized, or configuration-authorized.
- No settings read endpoint can be accessed without a valid session.
- No settings write endpoint can be accessed without configuration write authorization.
- Unauthorized direct API calls fail even when crafted outside the dashboard UI.
- Protected API responses do not leak guild settings or module metadata to unauthorized users.
- Audit context is available for all configuration mutations.

### Validation Steps

- Attempt every dashboard API endpoint while logged out.
- Attempt every guild settings endpoint as an unauthorized user.
- Attempt every guild settings endpoint as an authorized user.
- Attempt module/configuration access for an unknown guild ID.
- Confirm all protected endpoint failures use the expected 401 or 403 response shape.

---

## Phase 7: Security Hardening

**Current Status:** COMPLETE  
**Completion Summary:** CSRF protection, security headers, route-driven rate limiting, structured security audit logging, production CORS, trusted-proxy IP handling, and production-readiness fixes are implemented.

**Goal:** Harden the completed authentication, session, authorization, and API surface before production deployment.

**Depends on:** Phase 6  
**Shippable Value:** The dashboard auth system is resilient against common web and OAuth attack paths.  
**Risk:** High

### Deliverables

- CSRF protection for state-changing dashboard API requests.
- Secure cookie flags: `HttpOnly`, `Secure`, appropriate `SameSite`, scoped `Path`, explicit expiration, and production domain policy.
- Secure-cookie enforcement for production HTTPS.
- OAuth state entropy, expiration, single-use enforcement, and replay rejection.
- Redirect validation using a strict allowlist of internal dashboard paths.
- Session fixation prevention through session rotation after authentication and privilege changes.
- Rate limiting for login, callback, logout, session, and protected API routes.
- Audit logging for login success, login failure, logout, authorization denial, session expiration, and configuration writes.
- Security response headers plan including CSP, frame protection, content type protection, referrer policy, and permissions policy.
- Sensitive data handling rules for logs, errors, and dashboard responses.

### Dependencies

- Complete API protection inventory from Phase 6.
- Existing logging and audit capabilities.
- Production domain and HTTPS assumptions for cookie behavior.

### Completion Criteria

- State-changing requests require valid CSRF protection.
- Session cookies are not readable by JavaScript.
- Production sessions require HTTPS.
- OAuth state replay is rejected.
- External redirect attempts are rejected.
- Login and API abuse are rate limited without blocking normal admin usage.
- Audit logs include enough context to investigate access and configuration changes.
- Error responses do not expose secrets, tokens, stack traces, or internal provider details.

### Validation Steps

- Attempt CSRF-style state-changing requests without the required token/header.
- Inspect production-mode cookie attributes.
- Replay a previously consumed OAuth state.
- Attempt open redirect payloads on login and callback flows.
- Trigger rate limits intentionally in a non-production environment.
- Review audit log entries for security events.

---

## Phase 8: Production Deployment

**Current Status:** COMPLETE

**Goal:** Deploy the secured dashboard to `https://dashboard.hoakfamily.web.id` behind HTTPS and a production reverse proxy.

**Depends on:** Phase 7  
**Shippable Value:** Authorized users can use the secured dashboard at the production domain.  
**Risk:** Medium-High

### Deliverables

- DNS configuration for `dashboard.hoakfamily.web.id`.
- Nginx reverse proxy configuration for dashboard static assets and API routing.
- HTTPS certificate provisioning and renewal plan.
- Reverse proxy forwarding headers for protocol, host, and client IP.
- Production environment variable checklist for OAuth, session, cookie, dashboard origin, API origin, and owner override configuration.
- CSP policy for dashboard production assets and API connections.
- Compression configuration for static assets and API responses where safe.
- Static asset caching policy with immutable caching for fingerprinted assets and no-cache behavior for HTML entry points.
- API caching policy that prevents caching authenticated settings responses.
- Deployment rollback plan to return to the previous stable production state.

### Dependencies

- Hardened auth/API stack from Phase 7.
- VPS or production host access.
- Domain and certificate management access.
- Discord OAuth application configuration access.

### Completion Criteria

- `https://dashboard.hoakfamily.web.id` serves the dashboard over HTTPS.
- HTTP redirects to HTTPS.
- Nginx forwards API requests to the correct internal service.
- OAuth callback URL exactly matches Discord application settings.
- Secure cookies work correctly behind the reverse proxy.
- CSP does not break dashboard bootstrapping or OAuth flow.
- Authenticated API responses are not cached by browsers or shared proxies.

### Validation Steps

- Open the production dashboard domain over HTTPS.
- Confirm HTTP-to-HTTPS redirect.
- Complete Discord login against the production callback URL.
- Verify session cookie creation and persistence behind Nginx.
- Verify logout clears the production session.
- Inspect response headers for CSP, caching, compression, and security headers.

---

## Phase 9: Production Validation

**Current Status:** COMPLETE

**Goal:** Validate the complete production deployment before declaring v3.1 complete.

**Depends on:** Phase 8  
**Shippable Value:** The team has repeatable evidence that production authentication, authorization, security, and rollback behavior are ready.  
**Risk:** Medium

### Deliverables

- Manual QA checklist.
- Security checklist.
- Deployment checklist.
- Rollback checklist.
- Production smoke test record.
- Known limitations and follow-up list limited to v3.1 scope.

### Manual QA Checklist

- Logged-out user sees login page.
- Discord login succeeds.
- Discord login cancellation returns a safe error state.
- Logged-in user sees profile identity.
- Authorized guilds appear in the guild selector.
- Unauthorized guilds do not appear in the guild selector.
- Authorized user can read guild settings.
- Authorized user can update guild settings.
- Unauthorized user cannot read or update guild settings.
- Logout ends the session.

### Security Checklist

- OAuth state is required and single-use.
- Redirects are restricted to approved dashboard paths.
- Session cookie is HTTP-only.
- Session cookie is secure in production.
- SameSite policy is explicitly set.
- Session expiration is enforced.
- CSRF protection blocks invalid state-changing requests.
- Rate limiting is active on auth and protected API routes.
- Audit logs record login, logout, denied authorization, and configuration writes.
- API errors do not expose secrets or stack traces.

### Deployment Checklist

- DNS resolves to the production host.
- HTTPS certificate is valid and renewable.
- Nginx reverse proxy routes dashboard and API traffic correctly.
- Required environment variables are present.
- Discord OAuth callback URL matches production.
- CSP and security headers are active.
- Static assets use safe caching.
- Authenticated API responses are not cached.

### Rollback Checklist

- Previous production build or service configuration is available.
- Nginx can be reverted to the previous known-good route/configuration.
- New auth/session database changes are backward-safe or isolated.
- Discord OAuth settings can be reverted if needed.
- Rollback preserves production bot operation.
- Rollback completion is verified with bot health and dashboard access checks.

### Completion Criteria

- All manual QA checklist items pass.
- All security checklist items pass or have an explicitly accepted production risk.
- Deployment checklist is complete.
- Rollback checklist is executable and tested at least once in staging or rehearsed step-by-step.
- No unrelated features are included in v3.1 completion scope.

---

## v3.1 Major Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Authentication provider | Discord OAuth | Matches the user identity and guild permission source used by the bot ecosystem. |
| Session model | Server-side sessions with opaque cookie IDs | Keeps provider tokens and authorization state out of the browser and allows immediate revocation. |
| Authorization enforcement | API middleware and authorization service | Dashboard UI cannot be trusted as an enforcement boundary. |
| Default authorization behavior | Default deny | Missing data, unknown guilds, Discord failures, and unknown modules/settings must fail closed. |
| Owner override | `OWNER_IDS` | Allows trusted operators to recover/administer the dashboard when Discord guild permission data is insufficient. |
| Guild eligibility | User guilds intersected with bot guilds | Users can only manage guilds where the bot is present and where they have sufficient authority. |
| OAuth state | Server-generated, expiring, single-use state | Prevents CSRF and replay attacks in the OAuth callback flow. |
| Redirect policy | Internal allowlist only | Prevents open redirect vulnerabilities during login and callback handling. |
| Cookie policy | HTTP-only, secure in production, explicit SameSite | Reduces XSS token theft risk and limits cross-site request behavior. |
| Deployment topology | Nginx reverse proxy with HTTPS | Provides a stable production entry point, TLS termination, compression, caching, and security headers. |

---

## v3.1 Assumptions

- The dashboard already exists and remains the v3.1 UI foundation.
- The REST API platform already exists and remains the v3.1 API foundation.
- v3.0.3 is production-frozen and should not receive unrelated architectural rewrites during v3.1.
- Supabase PostgreSQL or an equivalent existing server-side data store is available for session and OAuth state persistence if needed.
- Discord OAuth application credentials can be created or updated for `dashboard.hoakfamily.web.id`.
- The bot can determine which guilds it is currently in.
- Discord guild permission information can be obtained from OAuth scopes and/or Discord API calls during authorization checks.
- `OWNER_IDS` is already an accepted operator trust mechanism or can be configured as one without changing unrelated permission systems.
- Production deployment uses a VPS or host where Nginx, HTTPS certificates, environment variables, and process management can be configured.

---

## v3.1 Risks Before Implementation

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|------------|--------|------------|
| 1 | Discord OAuth scopes may not provide enough guild permission detail for every authorization decision. | Medium | High | Define the exact scopes and fallback Discord API calls during Phase 4; fail closed on missing data. |
| 2 | Session storage schema or cleanup strategy may affect production database operations. | Medium | Medium | Keep session tables isolated from configuration tables and define TTL cleanup before deployment. |
| 3 | Secure cookies may fail behind Nginx if proxy headers or trust proxy settings are wrong. | Medium | High | Validate forwarded protocol/host headers and production cookie behavior in Phase 8. |
| 4 | OAuth callback URL mismatch can block production login. | Medium | High | Treat Discord application settings as part of the deployment checklist and validate before release. |
| 5 | Authorization bugs could expose guild settings to the wrong user. | Medium | High | Enforce authorization in middleware, default deny, and validate every endpoint class in Phase 6. |
| 6 | CSRF protection could break legitimate dashboard writes if client and server contracts are unclear. | Medium | Medium | Define the CSRF transport contract during Phase 7 and validate all state-changing endpoints. |
| 7 | CSP may block dashboard assets or OAuth-related flows. | Medium | Medium | Start with a strict but tested CSP in staging and verify production headers before completion. |
| 8 | Rate limiting could lock out legitimate administrators during login troubleshooting. | Low-Medium | Medium | Use route-specific limits and document safe operational reset procedures. |
| 9 | Audit logs may accidentally record sensitive OAuth/session data. | Low-Medium | High | Define sensitive data redaction rules before audit logging is enabled. |
| 10 | Production rollback may be complicated if auth changes are mixed with unrelated feature work. | Medium | High | Keep v3.1 scope limited to auth, authorization, security, and deployment only. |

---

## v3.1 Project Status

| Phase | Status | Primary Outcome |
|-------|--------|-----------------|
| 1. Authentication Foundation | **COMPLETE** | Auth contracts, request context, identity types, and session abstractions are implemented. |
| 2. Discord OAuth Provider | **COMPLETE** | Users can authenticate with Discord through OAuth login/callback with state validation and replay protection. |
| 3. Session Management | **COMPLETE** | Server-side PostgreSQL sessions, secure cookies, logout revocation, expiration, and cleanup scheduling protect dashboard access. |
| 4. Authorization | **COMPLETE** | User access is evaluated for dashboard, guild, module, and configuration scopes with owner override and guild filtering. |
| 5. Dashboard Integration | **COMPLETE** | Dashboard uses real login, logout, session bootstrap, authenticated states, and guild selector flows. |
| 6. API Protection | **COMPLETE** | Dashboard API endpoints are protected by authentication and authorization middleware with standard envelopes. |
| 7. Security Hardening | **COMPLETE** | CSRF, security headers, rate limiting, audit logging, production CORS, trusted proxy handling, and readiness fixes are implemented. |
| 8. Production Deployment | **COMPLETE** | `dashboard.hoakfamily.web.id` is deployed behind HTTPS and Nginx. |
| 9. Production Validation | **COMPLETE** | QA, security, deployment, and rollback validation are complete against production. |

**Implementation progress:** 9 of 9 v3.1 phases complete.  
**Remaining scope:** None.

> v3.1.0 Authentication, Authorization, Security, and Production Dashboard is complete.

---

# Hoak Bot v3.2.0
## Dashboard Redesign

**Version:** 3.2.0  
**Status:** NEXT  
**Current:** v3.1.0 COMPLETE  
**Next:** v3.2.0 Dashboard Redesign  
**Scope:** Dashboard UI/UX redesign only  
**Release Type:** Frontend dashboard release  
**Backend Impact:** No backend architecture changes

---

## v3.2 Objective

Version 3.2.0 redesigns the entire dashboard UI/UX with a Discord Developer Portal inspired experience while preserving the existing backend architecture.

This is not a backend release. Authentication, authorization, REST APIs, database structure, voice runtime, and Discord bot runtime behavior remain stable from v3.1.0.

---

## Project Goals

- Professional developer dashboard
- Better navigation
- Better scalability
- Modern component architecture
- Consistent design system
- Better UX
- Better accessibility
- Mobile responsive
- Future-proof module expansion

---

## Non-Goals

- Backend authentication changes
- OAuth changes
- Authorization changes
- Database redesign
- REST API redesign
- Voice runtime changes
- Discord bot runtime changes

---

## v3.2 Architecture Principles

- Component-first architecture
- Design-token driven
- Accessibility first
- Mobile-first responsive layout
- Shared reusable UI components
- Consistent spacing
- Consistent typography
- Consistent interaction patterns
- No duplicated components

---

## v3.2 Dependency Graph

```
Phase 1: Design System Foundation
    |
    v
Phase 2: Application Layout
    |
    v
Phase 3: Core Components
    |
    v
Phase 4: Dashboard Home
    |
    v
Phase 5: Module Pages
    |
    v
Phase 6: UX Improvements
    |
    v
Phase 7: Accessibility
    |
    v
Phase 8: Responsive Design
    |
    v
Phase 9: Polish
```

**Dependency order:** Phase 1 -> Phase 2 -> Phase 3 -> Phase 4 -> Phase 5 -> Phase 6 -> Phase 7 -> Phase 8 -> Phase 9

**Arrow = depends on.** Each phase depends on the phase above it and must not require backend architecture changes.

---

## Phase 1: Design System Foundation

**Goal:** Establish the visual and interaction foundation before rebuilding dashboard screens.

### Deliverables

- Design Tokens
- Theme
- Typography
- Color System
- Spacing
- Icons
- Motion
- Elevation
- Component Library

---

## Phase 2: Application Layout

**Goal:** Create the primary dashboard shell for scalable navigation and workspace context.

### Deliverables

- Sidebar
- Header
- Breadcrumb
- Workspace Selector
- User Menu
- Responsive Navigation

---

## Phase 3: Core Components

**Goal:** Build reusable UI primitives used consistently across every dashboard page.

### Deliverables

- Button
- Input
- Select
- Card
- Badge
- Table
- Modal
- Drawer
- Tabs
- Toast
- Skeleton
- Empty State
- Loading

---

## Phase 4: Dashboard Home

**Goal:** Redesign the dashboard landing experience around overview, activity, and fast action flows.

### Deliverables

- Home
- Overview
- Quick Actions
- Statistics
- Activity Feed
- Search
- Recent Changes

---

## Phase 5: Module Pages

**Goal:** Convert every module into a dedicated settings page while preserving existing backend contracts.

### Module Page Examples

- General
- Voice
- Welcome
- Goodbye
- Logging
- Moderation
- Future Modules

### Page Structure

Each page should include these sections where applicable:

- Overview
- Configuration
- Permissions
- Logs
- Status

---

## Phase 6: UX Improvements

**Goal:** Improve daily administrator workflows and reduce friction across configuration tasks.

### Deliverables

- Command Palette (Ctrl+K)
- Better Forms
- Unsaved Changes Protection
- Better Error Handling
- Better Loading
- Better Notifications

---

## Phase 7: Accessibility

**Goal:** Make the redesigned dashboard accessible by default across navigation, forms, overlays, and status feedback.

### Deliverables

- WCAG AA
- Keyboard Navigation
- Screen Reader
- Focus Management
- Contrast Validation

---

## Phase 8: Responsive Design

**Goal:** Ensure the redesigned dashboard works across mobile, tablet, and desktop layouts.

### Deliverables

- Mobile
- Tablet
- Desktop
- Collapsible Sidebar
- Responsive Tables
- Responsive Forms

---

## Phase 9: Polish

**Goal:** Complete the final interaction, state, and consistency pass before release.

### Deliverables

- Animation
- Micro-interactions
- Empty States
- Error States
- Final UI consistency pass

---

## v3.2 Risks

- Scope creep
- Inconsistent components
- Accessibility regressions
- Responsive regressions
- State management complexity
- Module migration complexity

---

## v3.2 Success Criteria

- Consistent UI across all pages
- Reusable component system
- Responsive on all supported devices
- Accessible navigation
- Modern developer experience
- Zero backend regressions

---

## v3.2 Project Status

| Release | Status | Summary |
|---------|--------|---------|
| v3.1.0 | **COMPLETE** | Authentication, Authorization, Security, and Production Dashboard are complete. |
| v3.2.0 | **NEXT** | Dashboard Redesign is the next major release. |
