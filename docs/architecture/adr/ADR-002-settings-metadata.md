# ADR-002: Settings Metadata & Registry

**Status:** Accepted  
**Applies to:** v3.0 Milestone 2  
**Dependencies:** ADR-001  

## Context

Every module has configurable settings. These settings must be discoverable, typed, validated, and renderable by the dashboard without per-module UI code.

## Decision

Settings are defined as an array of `ISettingMetadata` objects, exported from each module's `<name>.settings.ts`. A central `SettingsRegistry` aggregates all settings from all modules.

```typescript
type SettingType =
  | 'string' | 'text' | 'number' | 'boolean'
  | 'select' | 'multiSelect'
  | 'channel' | 'role' | 'user' | 'emoji'
  | 'color' | 'image' | 'audio'
  | 'duration' | 'json'
  | 'template';

interface ISettingMetadata {
  key: string;                           // Namespaced: "moduleName.settingName"
  label: string;                         // Human-readable label
  description: string;                   // Help text
  group: string;                         // Sub-group within category
  category: string;                      // Render grouping (e.g., "General", "Audio")
  type: SettingType;
  defaultValue: unknown;
  placeholder?: string;
  options?: { label: string; value: string; description?: string }[];
  validation?: z.ZodTypeAny;
  min?: number;                          // number types
  max?: number;                          // number types
  step?: number;                         // number types (for sliders)
  unit?: string;                         // Display unit ("ms", "%", "MB")
  minLength?: number;                    // string types
  maxLength?: number;                    // string types
  pattern?: string;                      // regex for string validation
  dependsOn?: string;                    // another setting key
  visibleIf?: Record<string, unknown>;   // conditions for visibility
  restartRequired?: boolean;             // requires bot restart on change
  advanced?: boolean;                    // collapsed by default in UI
  experimental?: boolean;                // marked as experimental
  premium?: boolean;                     // premium/feature-gated
  secret?: boolean;                      // masked input
  order?: number;                        // display order within group
  multiple?: boolean;                    // for multi-value types
  defaultSource?: 'manifest' | 'config' | 'env';
  affects?: string;                      // human description of what this controls
}

interface ISettingsRegistry {
  register(moduleId: string, settings: ISettingMetadata[]): void;
  getAll(): ISettingMetadata[];
  getByCategory(category: string): ISettingMetadata[];
  getByModule(moduleId: string): ISettingMetadata[];
  getByGroup(moduleId: string, group: string): ISettingMetadata[];
  get(key: string): ISettingMetadata | undefined;
  validate(key: string, value: unknown): { success: boolean; error?: string };
  onChange(handler: (key: string, value: unknown, guildId: string) => void): () => void;
}
```

**Key design decisions:**
- Keys are namespaced as `"moduleName.settingName"` to prevent collisions
- `validation` uses Zod schemas attached to each setting (not separate validators)
- `visibleIf` and `dependsOn` enable dynamic UI without custom components
- `order` controls render sequence within a group
- `group` enables multi-level category/group nesting in the dashboard

## Consequences

**Positive:**
- Dashboard renders every setting without module-specific code
- Setting types are extensible (add a string literal to `SettingType`)
- Validation travels with the setting definition
- Dynamic visibility and dependency logic is declarative

**Negative:**
- Complex settings (e.g., permission role mapping) may need a `json` type fallback
- Validation schemas must be serializable for API transmission

## Related

- ADR-001: Module Manifest
- ADR-003: Config Provider
- ADR-008: Dashboard Architecture
