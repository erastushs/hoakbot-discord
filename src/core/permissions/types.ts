export type PermissionOverrideEffect = 'allow' | 'deny';

export interface IPermissionAction {
  key: string;
  module: string;
  name: string;
  description: string;
  category?: string;
  dangerous?: boolean;
}

export interface PermissionOverride {
  guildId: string;
  action: string;
  effect: PermissionOverrideEffect;
}

export interface RolePermissionOverride extends PermissionOverride {
  roleId: string;
}

export interface UserPermissionOverride extends PermissionOverride {
  userId: string;
}

export interface PermissionCheckContext {
  guildId: string;
  userId: string;
  roleIds: string[];
  action: string;
}

export interface PermissionCheckResult {
  allowed: boolean;
  reason: 'user_override' | 'role_override' | 'default_deny' | 'unknown_action';
}

export interface IPermissionRegistry {
  register(action: IPermissionAction): void;
  registerMany(actions: IPermissionAction[]): void;
  get(action: string): IPermissionAction | undefined;
  getAll(): IPermissionAction[];
  getByModule(moduleId: string): IPermissionAction[];
  exists(action: string): boolean;
  has(action: string): boolean;
}

export interface IPermissionService {
  registerActions(actions: IPermissionAction[]): void;
  getAction(action: string): IPermissionAction | undefined;
  getActions(): IPermissionAction[];
  setRoleOverride(override: RolePermissionOverride): void;
  setUserOverride(override: UserPermissionOverride): void;
  getRoleOverride(guildId: string, roleId: string, action: string): RolePermissionOverride | undefined;
  getUserOverride(guildId: string, userId: string, action: string): UserPermissionOverride | undefined;
  check(context: PermissionCheckContext): PermissionCheckResult;
}
