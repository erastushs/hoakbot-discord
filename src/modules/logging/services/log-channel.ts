import type { Client, TextChannel } from 'discord.js';
import type { ILogger } from '../../../core/logger/logger.service.js';

export function resolveLogChannel(
  client: Client,
  guildId: string,
  channelId: string,
  logger: ILogger,
): TextChannel | null {
  const guild = client.guilds.cache.get(guildId);
  if (!guild) {
    logger.warn({ guildId }, 'Guild not found for log channel');
    return null;
  }

  const channel = guild.channels.cache.get(channelId) as TextChannel | undefined;
  if (!channel) {
    logger.warn({ channelId, guildId }, 'Log channel not found in guild');
    return null;
  }

  return channel;
}
