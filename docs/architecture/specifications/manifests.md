# Module Manifest Specification

## Overview

Every module exports a static, JSON-serializable manifest. The manifest is the module's contract with the platform. It declares identity, capabilities, dependencies, and metadata that external systems (dashboard, API, CLI) need.

## File Location

Each module declares its manifest in `<module-name>.manifest.ts`:

```
src/modules/voice/voice.manifest.ts   → export const manifest: IModuleManifest
src/modules/general/general.manifest.ts
```

## Schema

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique stable identifier. Format: `"hoak:<moduleId>"` for first-party. |
| `name` | `string` | Human-readable display name (max 32 chars). |
| `description` | `string` | Short description (max 160 chars). |
| `icon` | `string` | Lucide icon identifier for dashboard rendering. |
| `color` | `string` | Hex color for dashboard accent (e.g., `"#5865F2"`). |
| `category` | `ModuleCategory` | Grouping category. One of: `core`, `moderation`, `utility`, `engagement`, `voice`, `logging`, `fun`, `economy`, `automation`, `integration`. |
| `version` | `string` | SemVer version. |
| `author` | `string` | Author identifier. |
| `supportsHotReload` | `boolean` | Whether `onConfigChange()` is implemented for live config. |

### Optional Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `license` | `string` | `"UNLICENSED"` | License identifier. |
| `settings` | `string[]` | `[]` | Setting keys this module registers. |
| `permissions` | `string[]` | `[]` | Permission action keys this module defines. |
| `commands` | `string[]` | `[]` | Command names this module registers. |
| `events` | `string[]` | `[]` | Event names this module publishes/subscribes to. |
| `routes` | `string[]` | `[]` | API route paths this module registers. |
| `metrics` | `string[]` | `[]` | Metric names this module exposes. |
| `migrations` | `string[]` | `[]` | Migration IDs this module contributes. |
| `featureFlags` | `string[]` | `[]` | Feature flag keys this module defines. |
| `healthChecks` | `string[]` | `[]` | Health check names this module registers. |
| `dependencies` | `string[]` | `[]` | Module IDs this module depends on. |
| `tags` | `string[]` | `[]` | Search/filter tags. |
| `requiredDiscordPermissions` | `string` | `""` | Discord permission bitflag string. |
| `documentation` | `string` | `""` | URL or relative file path to module docs. |

### Dashboard Config

```typescript
interface DashboardConfig {
  navigation: {
    sidebarPriority: number;      // Sort order (lower = higher)
    sidebarSection: string;       // Section label in sidebar
    hidden: boolean;              // Hide from sidebar (e.g., core modules)
  };
  homePage: {
    featured: boolean;            // Show on home page
    priority: number;             // Sort order on home page
    bannerUrl?: string;           // Optional banner image
  };
  settings: {
    groups: SettingGroup[];       // Custom group overrides
  };
}
```

## Example

```typescript
// src/modules/voice/voice.manifest.ts
import type { IModuleManifest } from '../../core/modules/manifest.types.js';

export const manifest: IModuleManifest = {
  id: 'hoak:voice',
  name: 'Voice',
  description: 'Voice following and sound playback automation',
  icon: 'headphones',
  color: '#5865F2',
  category: 'voice',
  version: '1.0.0',
  author: 'Erastus HS',
  supportsHotReload: true,
  settings: [
    'voice.standby_channel',
    'voice.volume',
    'voice.cooldown_ms',
    'voice.reconnect_delay_ms',
    'voice.max_reconnect_retries',
    'voice.default_sound',
    'voice.enabled',
  ],
  permissions: ['voice:configure', 'voice:trigger'],
  commands: ['voice-config'],
  events: ['voice.member.joined', 'voice.sound.played', 'voice.connection.lost'],
  tags: ['voice', 'audio', 'sound', 'automation'],
  dashboard: {
    navigation: { sidebarPriority: 10, sidebarSection: 'Voice' },
    homePage: { featured: true, priority: 10 },
  },
};
```

## Validation

Manifests are validated at registration time:

1. `id` must be unique across all modules
2. `dependencies` must reference existing module IDs
3. Referenced `settings`, `permissions`, `commands` must actually exist
4. Circular dependencies are rejected
5. Version must be valid SemVer
