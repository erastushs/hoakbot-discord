# Historical ADR-003: Configuration Provider Interface

> Archived by Release Phase R3. Superseded for v4 baseline decisions by `docs/adr/ADR-012-Configuration.md`.

**Status:** Accepted  
**Applies to:** v3.0 Milestone 2  
**Dependencies:** ADR-002  

## Context

Every service currently reads configuration from `ConfigService` or directly from `config/bot.json`. This creates tight coupling to the file system and prevents per-guild configuration.

## Decision

All configuration access goes through `IConfigProvider`, an interface that abstracts the storage backend. Multiple implementations exist: file-based (defaults), database-backed (per-guild), and caching.

```typescript
interface IConfigProvider {
  get<T>(key: string, guildId?: string): Promise<T>;
  getMany<T>(keys: string[], guildId?: string): Promise<Record<string, T>>;
  getDefaults(): Promise<Record<string, unknown>>;
  set(key: string, value: unknown, options?: ConfigSetOptions): Promise<void>;
  setMany(entries: ConfigEntry[], guildId?: string): Promise<void>;
  watch(key: string, guildId: string | undefined, handler: ConfigChangeHandler): () => void;
}

interface ConfigSetOptions {
  guildId?: string;
  changedBy?: string;
  source?: 'api' | 'cli' | 'bot' | 'file';
  skipValidation?: boolean;
  skipAudit?: boolean;
}

interface ConfigEntry {
  key: string;
  value: unknown;
}

type ConfigChangeHandler = (change: ConfigChangeEvent) => void;

interface ConfigChangeEvent {
  key: string;
  oldValue: unknown;
  newValue: unknown;
  guildId?: string;
  changedBy?: string;
  source: string;
  timestamp: number;
}
```

**Implementation chain (read path):**
```
Consumer → ConfigProvider (facade)
  → CacheProvider.get(key, guildId)        [fast]
  → DatabaseConfigProvider.get(key, guildId) [authoritative]
  → DefaultConfigProvider.get(key)          [fallback from manifest]
  → CacheProvider.set(key, value, guildId)  [warm]
```

**Write path:**
```
Consumer → ConfigProvider.set(key, value, opts)
  → Zod validation (from SettingsRegistry)
  → DatabaseConfigProvider.set(key, value, guildId)
  → CacheProvider.del(key, guildId)
  → EventBus.publish('config:changed', ConfigChangeEvent)
  → AuditService.log(...)
```

## Consequences

**Positive:**
- All config consumers are decoupled from storage
- Per-guild configuration is transparent to consumers
- Cache sits invisibly between consumers and storage
- Watch enables live config without polling

**Negative:**
- Every config read is async (impact on hot-path commands mitigated by cache)
- The facade layer adds complexity

**Mitigation:** Cache warming on startup loads all guild settings into memory. Cache TTL is generous (30s default). Hot-path reads are synchronous cache hits.

## Related

- ADR-002: Settings Metadata
- ADR-006: Database Config
- ADR-010: Config Lifecycle
