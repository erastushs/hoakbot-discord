import type { GuildIdentity, PermissionSource } from '../auth.types.js';
import type { PermissionDecision } from './authorization.types.js';

const ADMINISTRATOR = 0x8n;
const MANAGE_GUILD = 0x20n;

export class PermissionResolver {
  resolveGuildPermission(guild: GuildIdentity | undefined): PermissionDecision {
    if (!guild) {
      return { allowed: false, source: 'unknown', reason: 'missing-guild' };
    }

    if (guild.owner) {
      return { allowed: true, source: 'discord:guild-owner', reason: 'guild-owner' };
    }

    const sources = guild.permissionSources ?? [];
    if (sources.includes('discord:administrator')) {
      return { allowed: true, source: 'discord:administrator', reason: 'administrator' };
    }

    if (sources.includes('discord:manage-guild')) {
      return { allowed: true, source: 'discord:manage-guild', reason: 'manage-guild' };
    }

    const flags = this.parsePermissionFlags(guild.rawPermissions);
    if (flags === undefined) {
      return { allowed: false, source: 'unknown', reason: 'unknown-permission' };
    }

    if ((flags & ADMINISTRATOR) === ADMINISTRATOR) {
      return { allowed: true, source: 'discord:administrator', reason: 'administrator' };
    }

    if ((flags & MANAGE_GUILD) === MANAGE_GUILD) {
      return { allowed: true, source: 'discord:manage-guild', reason: 'manage-guild' };
    }

    return { allowed: false, source: 'unknown', reason: 'insufficient-permission' };
  }

  private parsePermissionFlags(rawPermissions: string | undefined): bigint | undefined {
    if (!rawPermissions) {
      return undefined;
    }

    try {
      return BigInt(rawPermissions);
    } catch {
      return undefined;
    }
  }
}

export function ownerOverrideSource(userId: string, ownerIds: readonly string[]): PermissionSource | undefined {
  return ownerIds.includes(userId) ? 'owner-ids' : undefined;
}
