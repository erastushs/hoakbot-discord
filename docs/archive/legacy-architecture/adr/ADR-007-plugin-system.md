# Historical ADR-007: Plugin System & Module Loading

> Archived by Release Phase R3. Superseded for v4 baseline decisions by `docs/adr/ADR-011-Plugin-System.md`.

**Status:** Accepted  
**Applies to:** v3.0 Milestone 4  
**Dependencies:** ADR-001, ADR-002  

## Context

The v2 module loader is a sequential loop that calls `module.register()` then `module.onStart()`. There is no dependency resolution, no lifecycle depth, and no validation. V3 needs a manifest-aware loader that validates dependency graphs, enforces registration order, and supports the full lifecycle.

## Decision

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

interface IModuleContext {
  container: IContainer;
  logger: ILogger;
  eventBus: IEventBus;
  settings: ISettingsRegistry;
  permissions: IPermissionRegistry;
  api: IAPIRegistry;
  commands: ICommandRegistry;
}
```

### Module Loader

```typescript
interface IModuleLoader {
  load(): Promise<void>;
  unload(moduleId: string): Promise<void>;
  reload(moduleId: string): Promise<void>;
  getLoaded(): IModule[];
  getEnabled(guildId: string): IModule[];
  isEnabled(moduleId: string, guildId: string): boolean;
}
```

### Dependency Graph

```typescript
interface IDependencyGraph {
  add(manifest: IModuleManifest): void;
  resolve(): string[];               // Topological sort
  validate(): DependencyValidation;
  getDependents(moduleId: string): string[];  // Reverse lookup
}

interface DependencyValidation {
  valid: boolean;
  errors: DependencyError[];
}

interface DependencyError {
  type: 'missing' | 'circular' | 'version_mismatch' | 'disabled';
  from: string;
  to: string;
  message: string;
}
```

### Discovery Strategy

Modules are discovered through a build-time manifest index. At build time, a script scans `src/modules/*/<name>.manifest.ts` and generates `src/modules/module-index.ts` that exports all manifests. The module loader imports this index.

For third-party modules (v4+), the loader scans `node_modules/hoak-module-*` patterns.

### Registration Order

```
1. DependencyGraph.validate() — hard fail on errors
2. For each module in dependency order:
     a. onPreRegister()
     b. onRegister() → register settings, permissions, commands, API
     c. onPostRegister()
3. For each module in dependency order:
     a. onPreStart()
     b. onStart()
     c. onPostStart()
4. Bot is ready
```

## Consequences

**Positive:**
- Modules explicitly declare dependencies
- Circular dependencies are caught at startup
- Full lifecycle gives modules clear setup/teardown boundaries
- Third-party support without architecture changes

**Negative:**
- Build-time manifest index requires a build step (not a runtime scan)
- Dependency errors are startup-fatal (no partial loading)

## Related

- ADR-001: Module Manifest
- ADR-002: Settings Metadata
- ADR-010: Config Lifecycle
