import { pino, type Logger } from 'pino';
import type { ConfigService } from '../config/config.service.js';

export type ILogger = Logger;
export type LogSinkLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogSink {
  write(level: LogSinkLevel, args: unknown[]): void;
}

export function createLogger(config: ConfigService, sink?: LogSink): ILogger {
  const { nodeEnv, logLevel } = config.get().env;
  const logger = nodeEnv === 'development'
    ? pino({
      level: logLevel,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss.l',
          ignore: 'pid,hostname',
        },
      },
    })
    : pino({
      level: logLevel,
      formatters: {
        level(label) {
          return { level: label };
        },
      },
      timestamp: pino.stdTimeFunctions.isoTime,
    });

  return sink ? withLogSink(logger, sink) : logger;
}

function withLogSink(logger: ILogger, sink: LogSink): ILogger {
  for (const level of ['trace', 'debug', 'info', 'warn', 'error', 'fatal'] satisfies LogSinkLevel[]) {
    const original = logger[level].bind(logger) as (...args: unknown[]) => void;
    logger[level] = ((...args: unknown[]) => {
      sink.write(level, args);
      original(...args);
    }) as ILogger[typeof level];
  }

  return logger;
}
