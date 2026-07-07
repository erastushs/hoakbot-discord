import type { AuthenticatedUser, ConfigurationAction, GuildIdentity, PermissionSource } from '../auth.types.js';

export interface AuthorizationPolicy {
  readonly ownerIds: readonly string[];
}

export interface GuildResolution {
  readonly guildId: string;
  readonly botGuild?: GuildIdentity;
  readonly userGuild?: GuildIdentity;
  readonly inBotGuild: boolean;
  readonly inUserGuild: boolean;
}

export interface GuildDataSource {
  getBotGuilds(): Promise<readonly GuildIdentity[]>;
  getUserGuilds(user: AuthenticatedUser): Promise<readonly GuildIdentity[]>;
}

export interface PermissionDecision {
  readonly allowed: boolean;
  readonly source: PermissionSource;
  readonly reason: string;
}

export type AuthorizationAction = ConfigurationAction | 'dashboard' | 'guild' | 'module';

export const REQUIRED_ADMIN_SOURCES = [
  'discord:guild-owner',
  'discord:administrator',
  'discord:manage-guild',
  'owner-ids',
] as const satisfies readonly PermissionSource[];
