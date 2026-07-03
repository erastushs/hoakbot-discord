import { PermissionRegistry } from './permission-registry.js';
import type {
  IPermissionAction,
  IPermissionRegistry,
  IPermissionService,
  PermissionCheckContext,
  PermissionCheckResult,
  RolePermissionOverride,
  UserPermissionOverride,
} from './types.js';

export class PermissionServiceV3 implements IPermissionService {
  private readonly roleOverrides = new Map<string, RolePermissionOverride>();
  private readonly userOverrides = new Map<string, UserPermissionOverride>();

  constructor(private readonly registry: IPermissionRegistry = new PermissionRegistry()) {}

  registerActions(actions: IPermissionAction[]): void {
    this.registry.registerMany(actions);
  }

  getAction(action: string): IPermissionAction | undefined {
    return this.registry.get(action);
  }

  getActions(): IPermissionAction[] {
    return this.registry.getAll();
  }

  setRoleOverride(override: RolePermissionOverride): void {
    this.ensureKnownAction(override.action);
    this.roleOverrides.set(this.roleOverrideKey(override.guildId, override.roleId, override.action), override);
  }

  setUserOverride(override: UserPermissionOverride): void {
    this.ensureKnownAction(override.action);
    this.userOverrides.set(this.userOverrideKey(override.guildId, override.userId, override.action), override);
  }

  getRoleOverride(guildId: string, roleId: string, action: string): RolePermissionOverride | undefined {
    return this.roleOverrides.get(this.roleOverrideKey(guildId, roleId, action));
  }

  getUserOverride(guildId: string, userId: string, action: string): UserPermissionOverride | undefined {
    return this.userOverrides.get(this.userOverrideKey(guildId, userId, action));
  }

  check(context: PermissionCheckContext): PermissionCheckResult {
    if (!this.registry.has(context.action)) {
      return { allowed: false, reason: 'unknown_action' };
    }

    const userOverride = this.getUserOverride(context.guildId, context.userId, context.action);
    if (userOverride) {
      return { allowed: userOverride.effect === 'allow', reason: 'user_override' };
    }

    for (const roleId of context.roleIds) {
      const roleOverride = this.getRoleOverride(context.guildId, roleId, context.action);
      if (roleOverride) {
        return { allowed: roleOverride.effect === 'allow', reason: 'role_override' };
      }
    }

    return { allowed: false, reason: 'default_deny' };
  }

  private ensureKnownAction(action: string): void {
    if (!this.registry.has(action)) {
      throw new Error(`Unknown permission action "${action}".`);
    }
  }

  private roleOverrideKey(guildId: string, roleId: string, action: string): string {
    return `${guildId}:${roleId}:${action}`;
  }

  private userOverrideKey(guildId: string, userId: string, action: string): string {
    return `${guildId}:${userId}:${action}`;
  }
}
