# Historical ADR-008: Dashboard Architecture

> Archived by Release Phase R3. Superseded for v4 baseline decisions by `docs/adr/ADR-013-Dashboard.md`. Runtime live updates use authenticated SSE, not a dashboard WebSocket endpoint.

**Status:** Accepted  
**Applies to:** v3.0 Milestone 7  
**Dependencies:** ADR-001, ADR-002, ADR-005, ADR-004  

## Context

The dashboard must never know about specific modules. It must render entirely from metadata fetched through the API. The dashboard is one client of the platform — not the platform itself.

## Decision

### Architecture

```
┌─────────────────────┐
│   Dashboard SPA      │  React/Vue standalone app
│   (Vite + React +    │  No SSR. Talks only to API.
│    Tailwind)          │  Zero bot code imports.
└────────┬────────────┘
         │ HTTP + WebSocket
         ▼
┌─────────────────────┐
│   API Server         │  Embedded Express/Fastify
│   (in bot process)   │  Reads from registries
└─────────────────────┘
```

### Component Architecture

```
App
├── AuthGuard
├── Layout
│   ├── Sidebar (generated from module metadata)
│   │   ├── GuildSelector
│   │   ├── ModuleNavGroup (category → module list)
│   │   │   └── ModuleNavItem (icon + name from manifest)
│   │   └── Footer (version, theme toggle)
│   ├── Topbar (search, breadcrumb, user menu)
│   │   ├── Search (command palette trigger)
│   │   └── Breadcrumb
│   └── Main Content
│       ├── HomePage
│       │   └── ModuleGrid
│       │       └── ModuleCard (icon, name, description from manifest)
│       ├── ModuleSettingsPage (generic, works for ANY module)
│       │   ├── ModuleHeader (manifest data)
│       │   ├── ModuleStatus (enabled/disabled toggle)
│       │   ├── SettingsGroup (by category from metadata)
│       │   │   └── SettingControl (rendered by type)
│       │   │       ├── BooleanControl
│       │   │       ├── NumberControl
│       │   │       ├── TextControl
│       │   │       ├── SelectControl
│       │   │       ├── ChannelPicker
│       │   │       ├── RolePicker
│       │   │       ├── ColorPicker
│       │   │       ├── DurationControl
│       │   │       └── JsonEditor
│       │   └── SaveIndicator
│       └── PermissionPage (generic)
│           └── PermissionMatrix (action × role from registry)
└── Shared
    ├── PermissionsGuard
    ├── LoadingState
    ├── ErrorBoundary
    └── Toast
```

### Data Flow

```
Page mounts → API calls (parallel):
  GET /api/v1/guilds/:id/modules       → enabled module list
  GET /api/v1/modules/:id/settings     → setting metadata
  GET /api/v1/guilds/:id/settings      → current values

Settings page renders entirely from these responses.
User changes setting → PUT /api/v1/guilds/:id/settings/:key
Response updates local state → optimistic UI
```

### No Build-Time Coupling

- Dashboard has zero knowledge of module names, setting keys, or setting types
- The `SettingType` union is the only shared type contract
- Adding a module = it appears in the dashboard automatically

## Consequences

**Positive:**
- Dashboard is a pure API consumer — replaceable without bot changes
- Zero per-module frontend code
- Module metadata changes automatically propagate to the UI
- Dashboard can be developed independently (even by a different developer)

**Negative:**
- API must return all metadata the dashboard needs (channels, roles, etc.)
- Dynamic rendering may have edge cases for unusual setting types

## Related

- ADR-001: Module Manifest
- ADR-002: Settings Metadata
- ADR-005: API Convention
