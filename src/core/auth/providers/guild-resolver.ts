import type { AuthenticatedUser } from '../auth.types.js';
import type { GuildDataSource, GuildResolution } from './authorization.types.js';

export class GuildResolver {
  constructor(private readonly dataSource: GuildDataSource) {}

  async resolveGuild(user: AuthenticatedUser, guildId: string): Promise<GuildResolution> {
    const [botGuilds, userGuilds] = await Promise.all([
      this.dataSource.getBotGuilds(),
      this.dataSource.getUserGuilds(user),
    ]);
    const botGuild = botGuilds.find((guild) => guild.id === guildId);
    const userGuild = userGuilds.find((guild) => guild.id === guildId);

    return {
      guildId,
      botGuild,
      userGuild,
      inBotGuild: Boolean(botGuild),
      inUserGuild: Boolean(userGuild),
    };
  }

  async resolveAccessibleGuilds(user: AuthenticatedUser): Promise<GuildResolution[]> {
    const [botGuilds, userGuilds] = await Promise.all([
      this.dataSource.getBotGuilds(),
      this.dataSource.getUserGuilds(user),
    ]);
    const guildIds = new Set([...botGuilds.map((guild) => guild.id), ...userGuilds.map((guild) => guild.id)]);

    return [...guildIds].map((guildId) => {
      const botGuild = botGuilds.find((guild) => guild.id === guildId);
      const userGuild = userGuilds.find((guild) => guild.id === guildId);
      return {
        guildId,
        botGuild,
        userGuild,
        inBotGuild: Boolean(botGuild),
        inUserGuild: Boolean(userGuild),
      };
    });
  }
}
