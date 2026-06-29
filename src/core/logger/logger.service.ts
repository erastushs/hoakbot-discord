import { pino, type Logger } from 'pino';
import type { ConfigService } from '../config/config.service.js';

export type ILogger = Logger;

export function createLogger(config: ConfigService): ILogger {
  const { nodeEnv, logLevel } = config.get().env;

  if (nodeEnv === 'development') {
    return pino({
      level: logLevel,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss.l',
          ignore: 'pid,hostname',
        },
      },
    });
  }

  return pino({
    level: logLevel,
    formatters: {
      level(label) {
        return { level: label };
      },
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  });
}
