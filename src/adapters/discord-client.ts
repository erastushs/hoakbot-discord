import { Client, GatewayIntentBits, Events } from 'discord.js';
import type { ActivityType, PresenceStatusData } from 'discord.js';
import type { AppConfig } from '../core/config/types.js';
import type { ILogger } from '../core/logger/logger.service.js';
import type { IEventBus } from '../core/event-bus/types.js';
import type { IMetrics } from '../core/metrics/types.js';

export function createDiscordClient(
  config: AppConfig,
  logger: ILogger,
  eventBus: IEventBus,
  metrics: IMetrics,
): Client {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildModeration,
    ],
  });

  client.on(Events.ClientReady, (readyClient) => {
    const guildCount = readyClient.guilds.cache.size;
    const pingMs = readyClient.ws.ping;

    logger.info(
      {
        username: readyClient.user?.tag,
        userId: readyClient.user?.id,
        guildCount,
        pingMs,
      },
      'Discord client ready',
    );

    metrics.gauge('guild_count').set(guildCount);

    eventBus.emit('bot.ready', {
      guildCount,
      pingMs,
    });
  });

  client.on(Events.Error, (error) => {
    logger.error({ error, source: 'discord' }, 'Discord client error');
  });

  client.on(Events.Warn, (warning) => {
    logger.warn({ warning, source: 'discord' }, 'Discord client warning');
  });

  if (config.env.nodeEnv !== 'production' || config.env.logLevel === 'trace') {
    client.on(Events.Debug, (message) => {
      logger.trace({ message, source: 'discord' }, 'Discord client debug');
    });
  }

  client.once(Events.ClientReady, () => {
    const presence = config.bot.presence;
    if (presence.type && presence.text && client.user) {
      client.user.setPresence({
        activities: [{ name: presence.text, type: presence.type as unknown as ActivityType }],
        status: 'online' as PresenceStatusData,
      });
    }
  });

  return client;
}
