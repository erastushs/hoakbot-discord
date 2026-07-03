# ADR-004: Permission Model

**Status:** Accepted  
**Applies to:** v3.0 Milestone 5  
**Dependencies:** ADR-001  

## Context

The v2 permission system maps Discord role names to hardcoded levels (administrator, moderator, trusted). V3 needs an action-based permission model where each module declares its own permission actions.

## Decision

Permissions are action-based and module-scoped. Each module declares `IPermissionAction[]` in its `<name>.permissions.ts`. A central `PermissionRegistry` aggregates all actions. Roles/users are mapped to allowed actions per guild.

```typescript
interface IPermissionAction {
  action: string;                        // "moduleName:actionName"
  label: string;                         // "Configure Voice Settings"
  description: string;                   // "Allows changing voice module configuration"
  group: string;                         // "Voice"
  defaultLevel: PermissionLevel;         // Default required level
}

type PermissionLevel = 'everyone' | 'member' | 'trusted' | 'moderator' | 'administrator' | 'owner';

interface IGuildPermissionOverrides {
  roleOverrides: Record<string, string[]>;     // roleId → action[]
  userOverrides: Record<string, string[]>;     // userId → action[]
}

interface IPermissionService {
  check(action: string, guildId: string, userId: string): Promise<boolean>;
  getGrantedActions(guildId: string, userId: string): Promise<string[]>;
  setRoleOverride(guildId: string, roleId: string, actions: string[]): Promise<void>;
  setUserOverride(guildId: string, userId: string, actions: string[]): Promise<void>;
  getEffectivePermissions(guildId: string, userId: string): Promise<IPermissionAction[]>;
}
```

**Permission resolution order:**
1. Bot owner → ALL actions granted
2. Guild owner → ALL actions granted  
3. User-specific override → exact match
4. Role-specific override → union of all matching roles
5. Module default level → based on user's highest role level
6. Deny

**Default level mapping:**
| Level | Implicit Condition |
|-------|-------------------|
| `everyone` | Any guild member |
| `member` | Joined > 24h ago |
| `trusted` | Has Trusted role |
| `moderator` | Has Moderator role or Manage Messages |
| `administrator` | Has Administrator permission |
| `owner` | Guild owner or bot owner |

## Consequences

**Positive:**
- Modules self-declare their permission surface
- Dashboard renders permission controls from registry data
- Granular: any user or role can be granted any action
- Backward-compatible with v2 level model (levels map to sets of actions)

**Negative:**
- Permission checks now require a database lookup (mitigated by cache)
- Migration needed from v2 role-level model to v2 action-based model

## Related

- ADR-001: Module Manifest
- ADR-005: API Convention (auth levels reference permissions)
