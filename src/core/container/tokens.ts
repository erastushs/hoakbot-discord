import type { InjectionToken } from './types.js';
import type { ILogger } from '../logger/logger.service.js';
import type { ConfigService } from '../config/config.service.js';
import type { AppConfig } from '../config/types.js';
import type { IEventBus } from '../event-bus/types.js';
import type { IDatabaseAdapter } from '../database/database-adapter.js';

export const TOKENS = {
  Config: Symbol('config') as InjectionToken<ConfigService>,
  Logger: Symbol('logger') as InjectionToken<ILogger>,
  AppConfig: Symbol('appConfig') as InjectionToken<Readonly<AppConfig>>,
  EventBus: Symbol('eventBus') as InjectionToken<IEventBus>,
  DatabaseAdapter: Symbol('databaseAdapter') as InjectionToken<IDatabaseAdapter>,
} as const;
