# Historical Permission Model Specification

> Archived by Release Phase R3. Current permission compatibility is governed by `docs/ARCHITECTURE.md`, `docs/adr/ADR-013-Dashboard.md`, and `docs/adr/ADR-014-Command-Discovery.md`.

## Overview

v3 uses an action-based permission model. Each module declares actions (e.g., `voice:configure`). Roles and users are mapped to allowed actions per guild. The permission service resolves whether a user is allowed to perform an action.

## Action Naming

```
<moduleId>:<actionName>

Examples:
  voice:configure
  voice:trigger
  moderation:kick
  moderation:ban
  logging:configure
  welcome:configure
  general:configure
```

Action names use kebab-case after the colon.

## Default Levels

Each action has a `defaultLevel` — the minimum user level required unless overridden:

| Level | Inherited By |
|-------|-------------|
| `owner` | Guild owner, bot owner |
| `administrator` | Discord Administrator permission |
| `moderator` | Manage Messages, Kick Members, Ban Members |
| `trusted` | Trusted role assignment |
| `member` | Guild membership > 24h |
| `everyone` | Any guild member |

## Override Resolution

```
1. Bot owner?        → ALLOW all
2. Guild owner?      → ALLOW all
3. User override?    → return userOverrides[userId].includes(action)
4. Role override?    → return roleOverrides.some(r => roleIds.includes(r) && roles[r].includes(action))
5. Default level?    → return userLevel >= action.defaultLevel
6. DENY
```

## Permission Registry

```typescript
interface IPermissionRegistry {
  register(moduleId: string, actions: IPermissionAction[]): void;
  getActions(moduleId?: string): IPermissionAction[];
  findAction(action: string): IPermissionAction | undefined;
  getAllActions(): IPermissionAction[];
}
```

## Database Schema

```sql
CREATE TABLE permission_overrides (
  id          BIGSERIAL PRIMARY KEY,
  guild_id    TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('role', 'user')),
  target_id   TEXT NOT NULL,
  action      TEXT NOT NULL,
  granted     BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(guild_id, target_type, target_id, action)
);
```

## API Endpoints

```
GET    /api/v1/guilds/:id/permissions          → all actions with effective grants
PUT    /api/v1/guilds/:id/permissions/role/:id  → set role overrides
PUT    /api/v1/guilds/:id/permissions/user/:id  → set user overrides
DELETE /api/v1/guilds/:id/permissions/:type/:id/:action → remove override
```
