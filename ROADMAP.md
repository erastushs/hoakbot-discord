# Hoak Bot v3.0 Roadmap

## Dashboard & Configuration Platform

The objective of v3.0 is not simply creating a web dashboard — it is transforming Hoak Bot into a configurable platform where every feature can be managed without editing `bot.json`.

---

## Phase 1 — Configuration Provider Layer

Create a configuration abstraction that decouples services from the JSON file system.

```
Services
    ↓
ConfigProvider (interface)
    ├── JsonConfigProvider     ← current bot.json
    ├── DatabaseConfigProvider ← Supabase
    └── CacheConfigProvider    ← in-memory (Redis/Valkey ready)
```

**Requirements**

- Define `IConfigProvider` interface with `get<T>(path, defaultValue?)` and `set<T>(path, value)`
- Implement `JsonConfigProvider` as the initial backend
- All services access config via provider, never via direct file reads
- Design interface for future backends (database, cache, remote)

**Acceptance**

- Zero direct imports of `bot.json` outside providers
- All existing config consumers migrated to provider

---

## Phase 2 — Database Configuration

Introduce persistent, guild-scoped configuration tables.

```
guild_settings      → { guild_id, prefix, language, timezone, ... }
logging_settings    → { guild_id, enabled, channel_id, voice/member/message/moderation ... }
voice_settings      → { guild_id, standby_channel_id, volume, cooldown_ms, ... }
welcome_settings    → { guild_id, enabled, channel_id, background_url, ... }
goodbye_settings    → { guild_id, enabled, channel_id, background_url, ... }
moderation_settings → { guild_id, enabled, log_channel_id, auto_mod, ... }
feature_settings    → { guild_id, module_name, enabled }
```

**Requirements**

- Each configuration group versioned independently (`schema_version` column)
- Migration system for schema evolution
- `DatabaseConfigProvider` implements `IConfigProvider`
- Fallback chain: database → JSON defaults

**Suggested Schema (guild_settings)**

```sql
CREATE TABLE guild_settings (
  id          BIGSERIAL PRIMARY KEY,
  guild_id    TEXT NOT NULL UNIQUE,
  settings    JSONB NOT NULL DEFAULT '{}',
  version     INTEGER NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);
```

---

## Phase 3 — Configuration Cache

Introduce an in-memory cache layer between services and the database.

```
ConfigProvider
    ↓
Memory Cache (TTL + invalidation)
    ↓
Database / JSON fallback
```

**Features**

- Hash-based change detection (invalidate on write)
- Per-key TTL with smart expiry
- Cache warming on bot startup
- Pub/sub invalidation ready for multi-instance (future Redis/Valkey)

**No bot restart required** for configuration changes.

---

## Phase 4 — Dashboard Backend API

Build a REST API for the dashboard to consume.

**Authentication**

| Method | Scope |
|---|---|
| Discord OAuth2 | `identify`, `guilds` |
| Guild ownership | Owner-restricted endpoints |
| Permission check | Administrator or Manage Guild permission |

**API Structure**

```
/api/auth          → login, callback, logout, session
/api/guilds        → list, select
/api/settings      → guild general settings
/api/logging       → voice, member, message, moderation
/api/voice         → standby channel, volume, cooldown
/api/welcome       → toggle, channel, background, template
/api/goodbye       → toggle, channel, background, template
/api/moderation    → log channel, auto-mod
/api/system        → health, version, metrics
```

**Tech**

- Express or Fastify
- Discord OAuth2 with `passport-discord`
- Session-based auth with secure cookies
- Rate limiting per guild
- Input validation with Zod (shared schemas with bot)

---

## Phase 5 — Dashboard Frontend Foundation

Build the foundation shell.

**Tech Stack**

- Next.js 14+ (App Router)
- Tailwind CSS
- TypeScript
- Shadcn/ui or Radix primitives

**Features**

- Discord OAuth2 login flow
- Guild selector (`/guilds`)
- Sidebar navigation (collapsible)
- Responsive layout (mobile-friendly)
- Dark mode toggle
- Permission-aware UI (hide restricted sections)
- Loading states and error boundaries

**Layout**

```
┌──────────────────────────────────────┐
│  Navbar (user avatar, guild name)    │
├──────────┬───────────────────────────┤
│ Sidebar  │                           │
│  ├ Guild │       Page Content        │
│  ├ Voice │                           │
│  ├ Log   │                           │
│  ├ Mod   │                           │
│  └ System│                           │
└──────────┴───────────────────────────┘
```

---

## Phase 6 — Settings Framework

Create a metadata-driven settings system so future feature pages require no custom UI code.

**Setting Definition**

```typescript
interface Setting {
  key: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'channel' | 'role';
  label: string;
  description: string;
  default: unknown;
  validation?: ZodSchema;
  category: string;
  options?: { label: string; value: string }[]; // for select type
}
```

**Rendering**

The dashboard automatically renders the correct control based on `type`:

- `string` → text input
- `number` → number input with min/max constraints
- `boolean` → toggle switch
- `select` → dropdown
- `channel` → Discord channel picker
- `role` → Discord role picker

Adding a new feature module should require **zero frontend code changes** — only a settings definition array.

---

## Phase 7 — Feature Pages

Implement configuration pages using the shared settings framework.

| Page | Settings |
|---|---|
| Voice | Standby channel, volume, cooldown, join delay, reconnect retries |
| Welcome | Enabled, channel, background URL, title, subtitle, body template |
| Goodbye | Enabled, channel, background URL, title, subtitle |
| Logging | Master toggle + Voice/Member/Message/Moderation sub-sections |
| Moderation | Log channel, auto-mod thresholds |
| General | Prefix, language, timezone |

**Every page uses `renderSettings(settings: Setting[])`** — no custom forms.

---

## Phase 8 — Live Configuration

Dashboard changes take effect immediately on the running bot.

```
Dashboard Save
    ↓
PUT /api/settings/:guild/:module
    ↓
Database UPSERT
    ↓
Cache invalidation
    ↓
ConfigProvider.get() returns new value
    ↓
Bot uses new config on next event
```

**No restart. No reload. No redeploy.**

Config consumers that cache values use the provider's `onChange` hook to subscribe to updates. Stateless lookups (most handlers) pick up changes automatically.

---

## Phase 9 — Plugin-ready Architecture

Design modules to self-register everything: commands, config sections, dashboard pages, API routes.

**Module Manifest**

```typescript
interface ModulePlugin {
  name: string;
  version: string;
  commands?: CommandClass[];
  settings?: Setting[];
  apiRoutes?: RouterFactory;
  dashboard?: {
    navItem: NavItem;
    pages?: PageEntry[];
  };
}
```

**Registration**

```typescript
// Each module folder has a manifest.ts
export default {
  name: 'voice',
  version: '1.0.0',
  commands: [VoiceCommand],
  settings: voiceSettings,
  apiRoutes: voiceApiRouter,
  dashboard: {
    navItem: { label: 'Voice', icon: 'mic', path: '/voice' },
  },
} satisfies ModulePlugin;
```

Future modules (Music, Economy, Tickets, Reaction Roles, AI) follow the same pattern and register automatically — **no core changes needed**.

---

## Phase 10 — Dashboard Polish

Production-ready dashboard features.

- Audit log (who changed what, when)
- Full-text search across settings
- Pagination for large guild lists
- Export guild config as JSON
- Import / Restore config from backup
- System health dashboard (metrics, uptime, latency)
- Real-time status via WebSocket
- Version checker (alert on new bot release)
- Error tracking and alerting

---

## Suggested Directory Structure

### ConfigProvider (Phase 1)

```
src/core/config-provider/
  provider.interface.ts      IConfigProvider
  json.provider.ts           JsonConfigProvider
  config.module.ts           Registers the provider in the container
  index.ts
```

### Database Config (Phase 2)

```
src/modules/config/
  database/
    migrations/
      001_guild_settings.sql
      002_logging_settings.sql
      003_voice_settings.sql
      ...
    database-config.provider.ts  DatabaseConfigProvider
  cache/
    cache-config.provider.ts     CacheConfigProvider
```

### Dashboard Backend (Phase 4)

```
dashboard/
  server/
    src/
      routes/
        auth.ts
        guilds.ts
        settings.ts
        logging.ts
        voice.ts
        welcome.ts
        goodbye.ts
        moderation.ts
        system.ts
      middleware/
        auth.ts
        rate-limit.ts
      app.ts
    package.json
```

### Dashboard Frontend (Phase 5)

```
dashboard/
  web/
    app/
      layout.tsx
      page.tsx
      (dashboard)/        ← authenticated routes
        layout.tsx
        guilds/page.tsx
        settings/page.tsx
        voice/page.tsx
        logging/page.tsx
        moderation/page.tsx
        welcome/page.tsx
        goodbye/page.tsx
        system/page.tsx
    components/
      ui/                 ← shadcn/ui
      sidebar.tsx
      navbar.tsx
      guild-selector.tsx
      settings-form.tsx   ← metadata-driven renderer
      channel-picker.tsx
      role-picker.tsx
    lib/
      api.ts              ← typed API client
      auth.ts
    package.json
```

---

## Milestone Breakdown

| Milestone | Estimate | Target |
|---|---|---|
| M1 — ConfigProvider Layer | 1-2 weeks | Phase 1 complete |
| M2 — Database Schema + Migration | 2-3 weeks | Phase 2 complete |
| M3 — Cache Layer | 1-2 weeks | Phase 3 complete |
| M4 — Backend API (Auth + Core) | 2-3 weeks | Phase 4 complete |
| M5 — Dashboard Shell + Auth | 2-3 weeks | Phase 5 complete |
| M6 — Settings Framework + Voice Page | 1-2 weeks | Phase 6 + first Phase 7 page |
| M7 — All Feature Pages | 2-3 weeks | Phase 7 complete |
| M8 — Live Config + Plugin Architecture | 2-3 weeks | Phase 8 + 9 complete |
| M9 — Polish + Testing | 1-2 weeks | Phase 10 complete |
| **Total** | **14-23 weeks** | |

---

## Version 3.0 Goal

Hoak Bot becomes a **platform** instead of a configurable script.

- Future modules installable with minimal code changes
- Dashboard never rewritten when features are added
- Everything driven by **modules**, **configuration metadata**, and **extensible interfaces**
- Maintainable. Future-proof. Extensible.
