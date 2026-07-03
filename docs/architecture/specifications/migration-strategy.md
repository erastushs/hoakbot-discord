# Migration Strategy Specification

## Overview

Two migration systems exist:

1. **Database migrations** — Schema changes (tables, indexes, constraints)
2. **Data migrations** — Settings values from bot.json to database

## Database Migrations

### Naming

```
NNN-description.sql
001-guild-settings.sql
002-config-audit-log.sql
```

### Requirements

Every migration must be:
- **Idempotent** — Uses `IF NOT EXISTS`, `CREATE OR REPLACE`, etc.
- **Reversible** — Has an explicit `down()` for rollback
- **Checksummed** — SHA256 of the up script prevents tampering

### Runner

```
Startup → MigrationRunner.pending() → compare applied vs available
  → Apply each pending migration in order
  → Record in _migrations table
  → Log result
```

### Module Migrations

Modules contribute migrations via their manifest. These are database migrations that the module needs:

```typescript
// voice/migrations/
//   001-audio-library-extensions.sql

// voice.manifest.ts
const manifest: IModuleManifest = {
  // ...
  migrations: ['hoak:voice:001'],
};
```

Module migrations run AFTER core migrations but BEFORE module initialization. They are tracked in the same `_migrations` table but prefixed with the module ID.

## Data Migration: bot.json → Database

### Strategy

The data migration happens gradually — not as a single event:

1. **Milestone 2** — Module manifests define `defaultValue` for every setting
2. **Milestone 3** — Database provider reads from DB, falls back to manifest defaults
3. **Milestone 7** — Dashboard becomes the primary configuration interface
4. **Eventually** — `bot.json` becomes optional (bootstrap overrides only)

### Default Seeding Script

A dedicated script seeds defaults from manifests:

```typescript
// scripts/seed-defaults.ts
for (const module of moduleRegistry.getAll()) {
  for (const guildId of guilds.getAllIds()) {
    const existing = await db.get(guildId, module.id);
    if (!existing) {
      await db.set(guildId, module.id, module.getDefaults());
    }
  }
}
```

### Conflict Resolution

If `bot.json` and manifest `defaultValue` differ:
- On first run: `bot.json` values are imported to the database
- After migration: manifest `defaultValue` is only used when no database row exists
- A `migrate-config` script prompts for conflicts

## Version Compatibility

During migration from v2 to v3:
- v2 `bot.json` continues to work as the source of defaults
- v3 modules read from the database with fallback to `bot.json`
- When all settings are configured via the dashboard, `bot.json` settings become unused
- No breaking change during the transition
