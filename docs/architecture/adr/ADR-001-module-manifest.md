# ADR-001: Module Manifest Schema

**Status:** Accepted  
**Applies to:** v3.0 Milestone 2  
**Dependencies:** None  
**Replaces:** None  

## Context

Every module must describe itself completely through static metadata. The dashboard, API, module loader, and permission system must all discover module capabilities without importing runtime code.

## Decision

The Module Manifest is a JSON-serializable plain object exported as a const from each module's `<name>.manifest.ts`. It describes every aspect of the module that external systems need to know.

```typescript
interface IModuleManifest {
  id: string;                          // Unique stable identifier (e.g., "hoak:voice")
  name: string;                        // Display name
  description: string;                 // Short description
  icon: string;                        // Lucide icon name for dashboard
  color: string;                       // Accent hex color for dashboard
  category: ModuleCategory;            // Grouping category
  version: string;                     // SemVer
  author: string;                      // Module author
  license: string;                     // License identifier

  settings: string[];                  // Keys referencing ISettingMetadata in settings registry
  permissions: string[];               // Keys referencing IPermissionAction in permission registry
  commands: string[];                  // Registered command names
  events: string[];                    // Events this module publishes/subscribes to
  routes: string[];                    // API routes this module registers
  metrics: string[];                   // Metric names this module exposes
  migrations: string[];                // Migration IDs this module contributes
  featureFlags: string[];              // Feature flag keys this module defines
  healthChecks: string[];              // Health check names this module registers
  dependencies: string[];              // Module IDs this module depends on
  dashboard: DashboardConfig;          // Dashboard navigation & rendering hints
  tags: string[];                      // Search/filter tags
  supportsHotReload: boolean;          // Whether settings changes apply without restart
  requiredDiscordPermissions: string;  // Discord permission bitflag string
  documentation: string;               // URL or file path to module docs
}

type ModuleCategory =
  | 'core'
  | 'moderation'
  | 'utility'
  | 'engagement'
  | 'voice'
  | 'logging'
  | 'fun'
  | 'economy'
  | 'automation'
  | 'integration';
```

## Consequences

**Positive:**
- Dashboard discovers all modules via a single API call
- No switch/if statements needed for module-specific UI
- Third-party modules can participate without code changes to the platform
- Dependencies, settings, and permissions are self-documenting

**Negative:**
- Manifests must be kept in sync with actual module capabilities
- Manifest validation is essential at registration time

**Mitigation:** A `generate-manifest` script can validate that declared commands, settings, and permissions actually exist at build time.

## Related

- ADR-002: Settings Metadata
- ADR-007: Plugin System
