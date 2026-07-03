# ADR-010: Configuration Change Lifecycle

**Status:** Accepted  
**Applies to:** v3.0 Milestone 8  
**Dependencies:** ADR-003, ADR-006, ADR-009  

## Context

Configuration changes must propagate to all consumers without polling. The lifecycle from dashboard save to module reaction must be deterministic, auditable, and resilient to concurrent changes.

## Decision

### Full Write Path

```
Client sends PUT /api/v1/guilds/:id/settings/:key
  │
  ▼
1. API Middleware
   ├── Authenticate session
   ├── Rate limit check
   └── Authorize (guild_admin or specific permission)
  │
  ▼
2. Request Validation (Zod)
   ├── Parse path params (guildId, key)
   ├── Parse body (value)
   └── Validate against ISettingMetadata.validation
  │
  ▼
3. ConfigProvider.set(key, value, { guildId, changedBy })
   ├── DatabaseConfigProvider.set()
   │   ├── BEGIN transaction
   │   ├── SELECT ... FOR UPDATE (pessimistic lock)
   │   ├── Read old_value from current row
   │   ├── Validate new_value against SettingsRegistry
   │   ├── UPDATE guild_settings SET settings = jsonb_set(...), version = version + 1
   │   ├── INSERT INTO config_audit_log (guild_id, module_id, setting_key, old_value, new_value, changed_by)
   │   └── COMMIT
   │
   ├── CacheProvider.del(key, guildId)  — invalidate cache
   │
   ├── EventBus.publish('config.setting.changed', ConfigChangedEvent)
   │   │
   │   ├──► Module.onConfigChange([event]) — react to change
   │   │     ├── VoiceModule → update AudioManager volume
   │   │     ├── WelcomeModule → update target channel
   │   │     └── ...
   │   │
   │   ├──► Dashboard WebSocket → push to connected clients
   │   │
   │   └──► AuditService → config_audit_log already written above
  │
  ▼
4. Response
   └── 200 OK { success: true, data: { key, value, version } }
```

### Concurrent Change Handling

- Pessimistic locking (`SELECT ... FOR UPDATE`) in the database transaction
- Version number on `guild_settings` row enables optimistic locking for future multi-instance
- EventBus delivers synchronously within the write transaction (no race window)

### Cache Invalidation Strategy

| Operation | Cache Action |
|-----------|-------------|
| Single setting write | `CacheProvider.del(key, guildId)` |
| Module bulk write | `CacheProvider.delPattern(`${moduleId}.*`, guildId)` |
| Module enable/disable | `CacheProvider.clear(guildId)` |
| Bot restart | `CacheProvider.clear()` |
| TTL expiry | Automatic (30s default) |

### Module Hot-Reload Contract

Modules declare `supportsHotReload: boolean` in their manifest. Modules that support it implement `onConfigChange()`. Modules that don't are noted in the dashboard with a "Restart required" badge for affected settings.

## Consequences

**Positive:**
- Zero polling throughout the system
- Deterministic change propagation: DB → Cache → Event → Modules → Dashboard
- Full audit trail with before/after values
- Concurrent writes are safe through row-level locking

**Negative:**
- Synchronous event delivery means a slow module handler delays the API response
- Cache invalidation is broad (clear pattern) rather than precise (individual key)

**Mitigation for slow handlers:** `onConfigChange` handlers should be fast (milliseconds). If a module needs heavy work on config change, it should queue the work via the scheduler.

## Related

- ADR-003: Config Provider
- ADR-006: Database Config
- ADR-009: Event Convention
