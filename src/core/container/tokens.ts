import type { InjectionToken } from './types.js';
import type { ILogger } from '../logger/logger.service.js';
import type { ConfigService } from '../config/config.service.js';
import type { ConfigurationService } from '../config/configuration.service.js';
import type { AppConfig } from '../config/types.js';
import type { IConfigProvider } from '../config/provider.types.js';
import type { IEventBus } from '../event-bus/types.js';
import type { IDatabaseAdapter } from '../database/database-adapter.js';
import type { IHealthService } from '../health/types.js';
import type { IMetrics } from '../metrics/types.js';
import type { ISettingsRegistry } from '../settings/types.js';
import type { ManifestRegistry } from '../../modules/manifest-registry.js';
import type { ModuleRegistry } from '../../modules/module-registry.js';
import type { Client } from 'discord.js';
import type { CommandRegistry } from '../../shared/command-registry.js';
import type { IAuthProvider, IAuthorizationProvider, ISessionProvider } from '../auth/index.js';

export const TOKENS = {
  Config: Symbol('config') as InjectionToken<ConfigService>,
  ConfigurationService: Symbol('configurationService') as InjectionToken<ConfigurationService>,
  Logger: Symbol('logger') as InjectionToken<ILogger>,
  AppConfig: Symbol('appConfig') as InjectionToken<Readonly<AppConfig>>,
  EventBus: Symbol('eventBus') as InjectionToken<IEventBus>,
  DatabaseAdapter: Symbol('databaseAdapter') as InjectionToken<IDatabaseAdapter>,
  HealthService: Symbol('healthService') as InjectionToken<IHealthService>,
  MetricsService: Symbol('metricsService') as InjectionToken<IMetrics>,
  DiscordClient: Symbol('discordClient') as InjectionToken<Client>,
  CommandRegistry: Symbol('commandRegistry') as InjectionToken<CommandRegistry>,
  SettingsRegistry: Symbol('settingsRegistry') as InjectionToken<ISettingsRegistry>,
  ManifestRegistry: Symbol('manifestRegistry') as InjectionToken<ManifestRegistry>,
  ModuleRegistry: Symbol('moduleRegistry') as InjectionToken<ModuleRegistry>,
  ConfigProvider: Symbol('configProvider') as InjectionToken<IConfigProvider>,
  AuthProvider: Symbol('authProvider') as InjectionToken<IAuthProvider>,
  SessionProvider: Symbol('sessionProvider') as InjectionToken<ISessionProvider>,
  AuthorizationProvider: Symbol('authorizationProvider') as InjectionToken<IAuthorizationProvider>,
} as const;
