# Historical ADR-006: Database Configuration Schema

> Archived by Release Phase R3. Current transactional configuration behavior is governed by `docs/adr/ADR-012-Configuration.md`.

**Status:** Accepted  
**Applies to:** v3.0 Milestone 3  
**Dependencies:** ADR-002, ADR-003  

## Context

Per-guild settings must be persisted in PostgreSQL. The database schema must support versioning, audit trail, and efficient lookup for the fallback chain.

## Decision

### Core Tables

```sql
CREATE TABLE guild_settings (
  id          BIGSERIAL PRIMARY KEY,
  guild_id    TEXT NOT NULL,
  module_id   TEXT NOT NULL,
  settings    JSONB NOT NULL DEFAULT '{}',
  version     INTEGER NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by  TEXT,
  UNIQUE(guild_id, module_id)
);

CREATE TABLE config_audit_log (
  id          BIGSERIAL PRIMARY KEY,
  guild_id    TEXT,
  module_id   TEXT NOT NULL,
  setting_key TEXT NOT NULL,
  old_value   JSONB,
  new_value   JSONB,
  changed_by  TEXT NOT NULL,
  source      TEXT NOT NULL DEFAULT 'api',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE module_states (
  guild_id    TEXT NOT NULL,
  module_id   TEXT NOT NULL,
  enabled     BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (guild_id, module_id)
);

-- Indexes
CREATE INDEX idx_guild_settings_lookup ON guild_settings(guild_id, module_id);
CREATE INDEX idx_config_audit_guild ON config_audit_log(guild_id, created_at DESC);
CREATE INDEX idx_config_audit_module ON config_audit_log(module_id, setting_key);
```

### Migration Strategy

```typescript
interface IMigration {
  id: string;                    // "001-guild-settings"
  moduleId?: string;             // null for core, module ID for module migrations
  description: string;
  up: (sql: SQL) => Promise<void>;
  down?: (sql: SQL) => Promise<void>;
  checksum: string;              // SHA256 of up script — detect tampering
}

interface IMigrationRunner {
  pending(): Promise<IMigration[]>;
  apply(migration: IMigration): Promise<void>;
  rollback(migration: IMigration): Promise<void>;
  applied(): Promise<{ id: string; appliedAt: Date; checksum: string }[]>;
}
```

### Default Seeding

On first guild join, default settings rows are seeded from module manifests:
1. Module registers → manifest defines `defaultValue` for each setting
2. Guild join event → `ModuleStateService` creates `guild_settings` row with defaults
3. If a row already exists (re-join after kick), existing values are preserved

### Fallback Chain (refined)

```
Consumer gets setting
  → Check MemoryCache (synchronous, Map)
  → Check DatabaseConfigProvider (async, guild_settings table)
  → Check DefaultConfigProvider (async, merged from all manifest defaults)
  → Warm cache with resolved value
```

## Consequences

**Positive:**
- Per-guild settings are persistent and guild-independent
- Audit log provides full configuration change history
- Module-level granularity prevents migration conflicts
- Checksums prevent migration tampering

**Negative:**
- Each guild gets one row per module (manageable at single-server scale)
- JSONB inside `settings` column means no foreign key validation on individual settings

## Related

- ADR-003: Config Provider
- ADR-010: Config Lifecycle
- ADR-002: Settings Metadata
