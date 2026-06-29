import { pino } from 'pino';
import { ConfigService } from './core/config/config.service.js';
import { createLogger } from './core/logger/logger.service.js';

const bootstrapLogger = pino({
  level: 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true, translateTime: 'HH:MM:ss.l', ignore: 'pid,hostname' },
  },
});

try {
  const config = new ConfigService();
  config.load();
  bootstrapLogger.info('Configuration loaded');

  const logger = createLogger(config);
  logger.info({ nodeVersion: process.version }, 'Hoak Bot started');
} catch (err) {
  bootstrapLogger.fatal({ error: err }, 'Failed to start Hoak Bot');
  process.exit(1);
}
