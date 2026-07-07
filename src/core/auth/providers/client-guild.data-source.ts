import type { Client } from 'discord.js';

import type { AuthenticatedUser, GuildIdentity } from '../auth.types.js';
import type { GuildDataSource } from './authorization.types.js';

export class ClientGuildDataSource implements GuildDataSource {
  constructor(private readonly client: Client) {}

  async getBotGuilds(): Promise<readonly GuildIdentity[]> {
    return this.client.guilds.cache.map((guild) => ({
      id: guild.id,
      name: guild.name,
      iconUrl: guild.iconURL() ?? undefined,
    }));
  }

  async getUserGuilds(user: AuthenticatedUser): Promise<readonly GuildIdentity[]> {
    const guilds = user.guilds;
    return Array.isArray(guilds) ? guilds.filter(isGuildIdentity) : [];
  }
}

function isGuildIdentity(value: unknown): value is GuildIdentity {
  return typeof value === 'object' && value !== null && 'id' in value && typeof value.id === 'string';
}
