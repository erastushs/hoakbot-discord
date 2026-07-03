# Settings Metadata Specification

## Overview

Settings metadata describes every configurable value a module exposes. The metadata is used for validation (Zod), rendering (dashboard), documentation, and discovery (API).

## Setting Types

### Core Types

| Type | Dashboard Control | Value Type | Validation Hints |
|------|-------------------|------------|------------------|
| `string` | Text input | `string` | minLength, maxLength, pattern |
| `text` | Textarea | `string` | minLength, maxLength |
| `number` | Number input / Slider | `number` | min, max, step |
| `boolean` | Toggle | `boolean` | — |
| `select` | Dropdown | `string` | options[] |
| `multiSelect` | Multi-select | `string[]` | options[] |

### Discord Types

| Type | Dashboard Control | Value Type | Notes |
|------|-------------------|------------|-------|
| `channel` | Channel picker | `string` (ID) | API populates channel list |
| `role` | Role picker | `string` (ID) | API populates role list |
| `user` | User picker | `string` (ID) | API populates user list |
| `emoji` | Emoji picker | `string` | Custom + default emojis |

### Display Types

| Type | Dashboard Control | Value Type | Notes |
|------|-------------------|------------|-------|
| `color` | Color picker | `string` (#hex) | Swatch + hex input |
| `image` | URL + preview | `string` (URL) | Image preview |
| `audio` | File upload / URL | `string` | Playback preview |
| `duration` | Duration input | `number` (ms) | Display as "5m 30s" |

### Advanced Types

| Type | Dashboard Control | Value Type | Notes |
|------|-------------------|------------|-------|
| `json` | JSON editor | `Record<string, unknown>` | Fallback for complex data |
| `template` | Template editor | `string` | With placeholder preview |

## Setting Key Convention

Keys follow the format: `<moduleId>.<settingName>` in dot notation.

```
voice.standby_channel    ✓
voice.volume             ✓
welcome.message.title    ✓
logging.voice.enabled    ✓
```

The module ID prefix is validated against the module's manifest. Cross-module settings are not allowed.

## Visibility Context

Dashboard controls visibility based on:

1. **Permission check** — `PermissionService.check(action, guildId, userId)`
2. **`visibleIf` condition** — Declarative match on current setting values
3. **`advanced` flag** — Hidden behind "Show advanced" toggle
4. **`experimental` flag** — Warning badge
5. **`premium` flag** — Lock badge with upgrade prompt

## Validation Rules

Each setting's `validation` is a Zod schema. The schema is:

1. Used on the API layer to validate incoming values
2. Transmitted to the dashboard (via `GET /api/v1/modules/:id/settings`) for client-side validation
3. Used in the write path by `ConfigProvider.set()`

**Serialization constraint:** The Zod schema must be serializable for transmission to the dashboard. Use `zod-to-json-schema` to expose the validation rules as JSON Schema rather than the Zod object itself.
