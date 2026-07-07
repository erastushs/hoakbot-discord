import { pino } from 'pino';
import { ConfigService } from './core/config/config.service.js';
import { ConfigurationService } from './core/config/configuration.service.js';
import { DatabaseConfigProvider } from './core/config/database-config.provider.js';
import { GuildSettingsRepository } from './core/config/guild-settings.repository.js';
import { JsonConfigProvider } from './core/config/json-config.provider.js';
import { createLogger } from './core/logger/logger.service.js';
import { Container } from './core/container/container.js';
import { TOKENS } from './core/container/tokens.js';
import {
  APIRouter,
  createAuthorizationMiddleware,
  createAPIHttpServer,
  createAuthEndpoints,
  createCsrfEndpoints,
  createCsrfMiddleware,
  createModuleConfigEndpoints,
  createSecurityHeadersMiddleware,
  createSessionAuthMiddleware,
  CsrfService,
  ok,
} from './core/api/index.js';
import {
  AuthorizationProvider,
  ClientGuildDataSource,
  DatabaseSessionProvider,
  DiscordOAuthProvider,
  FetchDiscordAPIClient,
  GuildResolver,
  OAuthStateService,
  SessionRepository,
} from './core/auth/index.js';
import { SettingsRegistry } from './core/settings/settings-registry.js';
import { ModuleLoader } from './modules/module-loader.js';
import { ManifestRegistry } from './modules/manifest-registry.js';
import { ModuleRegistry } from './modules/module-registry.js';
import { EventBus } from './core/event-bus/event-bus.js';
import { SupabaseAdapter } from './core/database/supabase.adapter.js';
import { HealthService } from './core/health/health.service.js';
import { MetricsService } from './core/metrics/metrics.service.js';
import { createDiscordClient } from './adapters/discord-client.js';
import { GeneralModule } from './modules/general/general.module.js';
import { VoiceModule } from './modules/voice/voice.module.js';
import { ModerationModule } from './modules/moderation/moderation.module.js';
import { LoggingModule } from './modules/logging/logging.module.js';
import { WelcomeModule } from './modules/welcome/welcome.module.js';
import { GoodbyeModule } from './modules/goodbye/goodbye.module.js';
import { CommandRegistry } from './shared/command-registry.js';
import type { HealthReport } from './core/health/types.js';

const bootstrapLogger = pino({
  level: 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true, translateTime: 'HH:MM:ss.l', ignore: 'pid,hostname' },
  },
});

let shuttingDown = false;

function registerCrashHanders(logger: ReturnType<typeof createLogger>, shutdown: () => Promise<void>): void {
  const forceExit = (code: number) => {
    setTimeout(() => process.exit(code), 5000).unref();
  };

  process.on('unhandledRejection', (reason) => {
    logger.fatal({ error: reason }, 'Unhandled promise rejection – shutting down');
    shutdown().finally(() => process.exit(1));
    forceExit(1);
  });

  process.on('uncaughtException', (error) => {
    logger.fatal({ error }, 'Uncaught exception – shutting down');
    shutdown().finally(() => process.exit(1));
    forceExit(1);
  });
}

try {
  const metricsService = new MetricsService();
  const startupTimer = metricsService.timer('startup');
  startupTimer.start();

  bootstrapLogger.info('Loading configuration...');
  const configService = new ConfigService();
  const appConfig = configService.load();

  bootstrapLogger.info('Creating logger...');
  const logger = createLogger(configService);

  logger.info('Registering core services...');
  const eventBus = new EventBus(logger);
  const container = new Container();
  container.registerSingleton(TOKENS.Config, () => configService);
  container.registerSingleton(TOKENS.Logger, () => logger);
  container.registerSingleton(TOKENS.AppConfig, () => appConfig);
  container.registerSingleton(TOKENS.EventBus, () => eventBus);
  container.registerSingleton(TOKENS.MetricsService, () => metricsService);

  const healthService = new HealthService(logger);
  container.registerSingleton(TOKENS.HealthService, () => healthService);

  metricsService.gauge('module_count').set(0);

  logger.info('Connecting to database...');
  const dbTimer = metricsService.timer('database.connect');
  dbTimer.start();
  const databaseAdapter = new SupabaseAdapter(appConfig, logger);
  await databaseAdapter.connect();
  dbTimer.stop();
  container.registerSingleton(TOKENS.DatabaseAdapter, () => databaseAdapter);

  logger.info('Creating Discord client...');
  const client = createDiscordClient(appConfig, logger, eventBus, metricsService);
  container.registerSingleton(TOKENS.DiscordClient, () => client);

  logger.info('Loading modules...');
  const moduleLoader = new ModuleLoader(logger, appConfig.featureFlags.modules);

  const sharedRegistry = new CommandRegistry();
  container.registerSingleton(TOKENS.CommandRegistry, () => sharedRegistry);

  const settingsRegistry = new SettingsRegistry();
  const manifestRegistry = new ManifestRegistry();
  const moduleRegistry = new ModuleRegistry();
  const apiRouter = new APIRouter();
  const guildSettingsRepository = new GuildSettingsRepository(databaseAdapter);
  const configProvider = new DatabaseConfigProvider(
    guildSettingsRepository,
    new JsonConfigProvider(),
    settingsRegistry,
  );
  const configurationService = new ConfigurationService(configProvider, settingsRegistry, eventBus, appConfig);
  const discordOAuthConfig = {
    clientId: appConfig.discord.oauth?.clientId ?? appConfig.discord.clientId,
    clientSecret: appConfig.discord.oauth?.clientSecret ?? '',
    redirectUri: appConfig.discord.oauth?.redirectUri ?? '',
  };
  const sessionConfig = {
    durationMs: appConfig.session?.durationMs ?? 1000 * 60 * 60 * 8,
    cookieName: appConfig.session?.cookieName ?? 'hoak_session',
    secureCookies: appConfig.env.nodeEnv === 'production',
  };
  const oauthStateService = new OAuthStateService();
  const sessionRepository = new SessionRepository(databaseAdapter);
  const sessionProvider = new DatabaseSessionProvider(sessionRepository, sessionConfig);
  const csrfService = new CsrfService({ tokenTtlMs: sessionConfig.durationMs });
  const guildResolver = new GuildResolver(new ClientGuildDataSource(client));
  const authorizationProvider = new AuthorizationProvider({ ownerIds: appConfig.ownerIds }, guildResolver);
  const discordOAuthProvider = new DiscordOAuthProvider(
    discordOAuthConfig,
    oauthStateService,
    new FetchDiscordAPIClient(discordOAuthConfig, logger),
  );

  container.registerSingleton(TOKENS.SettingsRegistry, () => settingsRegistry);
  container.registerSingleton(TOKENS.ManifestRegistry, () => manifestRegistry);
  container.registerSingleton(TOKENS.ModuleRegistry, () => moduleRegistry);
  container.registerSingleton(TOKENS.ConfigProvider, () => configProvider);
  container.registerSingleton(TOKENS.ConfigurationService, () => configurationService);
  container.registerSingleton(TOKENS.AuthProvider, () => discordOAuthProvider);
  container.registerSingleton(TOKENS.SessionProvider, () => sessionProvider);
  container.registerSingleton(TOKENS.AuthorizationProvider, () => authorizationProvider);

  const generalModule = new GeneralModule();
  const voiceModule = new VoiceModule();
  const moderationModule = new ModerationModule();
  const loggingModule = new LoggingModule();
  const welcomeModule = new WelcomeModule();
  const goodbyeModule = new GoodbyeModule();
  manifestRegistry.register(generalModule.manifest);
  manifestRegistry.register(voiceModule.manifest);
  manifestRegistry.register(moderationModule.manifest);
  manifestRegistry.register(loggingModule.manifest);
  manifestRegistry.register(welcomeModule.manifest);
  manifestRegistry.register(goodbyeModule.manifest);
  moduleRegistry.register(generalModule);
  moduleRegistry.register(voiceModule);
  moduleRegistry.register(moderationModule);
  moduleRegistry.register(loggingModule);
  moduleRegistry.register(welcomeModule);
  moduleRegistry.register(goodbyeModule);
  moduleLoader.registerModule(generalModule);
  moduleLoader.registerModule(voiceModule);
  moduleLoader.registerModule(moderationModule);
  moduleLoader.registerModule(loggingModule);
  moduleLoader.registerModule(welcomeModule);
  moduleLoader.registerModule(goodbyeModule);

  await moduleLoader.loadAll(container);
  apiRouter.use(createSecurityHeadersMiddleware());
  apiRouter.use(createSessionAuthMiddleware({ sessionProvider, sessionConfig }));
  apiRouter.use(createAuthorizationMiddleware({ authorizationProvider }));
  apiRouter.use(createCsrfMiddleware({ csrfService }));
  for (const endpoint of createAuthEndpoints({
    authProvider: discordOAuthProvider,
    sessionProvider,
    sessionConfig,
    authorizationProvider,
    guildResolver,
    dashboardUrl: appConfig.dashboard?.url ?? 'http://localhost:5173',
    csrfService,
  })) {
    apiRouter.register(endpoint);
  }
  for (const endpoint of createCsrfEndpoints({ csrfService, sessionProvider })) {
    apiRouter.register(endpoint);
  }
  for (const endpoint of createModuleConfigEndpoints({
    manifests: manifestRegistry,
    settings: settingsRegistry,
    config: configurationService,
  })) {
    apiRouter.register(endpoint);
  }
  await moduleLoader.startAll();
  metricsService.gauge('module_count').set(moduleLoader.getLoadedModules().length);

  logger.info('Running health checks...');
  const healthTimer = metricsService.timer('health');
  healthTimer.start();
  registerHealthChecks(healthService, configService, databaseAdapter, eventBus, moduleLoader, logger, metricsService);
  const report = await healthService.runAll();
  healthTimer.stop();

  apiRouter.register({
    module: 'platform',
    method: 'GET',
    path: '/system/health',
    auth: 'public',
    metadata: { operationId: 'getSystemHealth', tags: ['system', 'health'] },
    handler: async () => ok(await healthService.runAll()),
  });

  const apiServer = createAPIHttpServer({
    port: appConfig.api.port,
    router: apiRouter,
    logger,
  });
  await apiServer.start();

  const shutdown = registerShutdownHandlers(logger, client, moduleLoader, databaseAdapter, eventBus, apiServer);
  registerCrashHanders(logger, shutdown);

  logger.info('Logging in to Discord...');
  await client.login(appConfig.discord.token);

  startupTimer.stop();

  printStartupSummary(report, moduleLoader, metricsService, logger);
} catch (err) {
  bootstrapLogger.fatal({ error: err }, 'Failed to start Hoak Bot');
  process.exit(1);
}

function printStartupSummary(
  report: HealthReport,
  moduleLoader: ModuleLoader,
  metrics: MetricsService,
  logger: ReturnType<typeof createLogger>,
): void {
  const icon = (status: string) => (status === 'healthy' ? '✓' : '✗');
  const lines = [
    '',
    '╔══════════════════════════╗',
    '║     Hoak Bot Startup     ║',
    '╠══════════════════════════╣',
    `║  Configuration    ${icon(report.subsystems['config']?.status ?? 'unhealthy')}      ║`,
    `║  Logger           ${icon(report.subsystems['logger']?.status ?? 'unhealthy')}      ║`,
    `║  Database         ${icon(report.subsystems['database']?.status ?? 'unhealthy')}      ║`,
    `║  Event Bus        ${icon(report.subsystems['eventBus']?.status ?? 'unhealthy')}      ║`,
    `║  Module Loader    ${icon(report.subsystems['moduleLoader']?.status ?? 'unhealthy')}      ║`,
    '╠══════════════════════════╣',
    `║  Status: ${report.status.toUpperCase()}${' '.repeat(Math.max(0, 9 - report.status.length))}║`,
    `║  Modules: ${String(moduleLoader.getLoadedModules().length)}${' '.repeat(Math.max(0, 12 - String(moduleLoader.getLoadedModules().length).length))}║`,
    `║  Startup: ${String(Math.round(metrics.timer('startup').duration()))}ms${' '.repeat(Math.max(0, 13 - String(Math.round(metrics.timer('startup').duration())).length - 2))}║`,
    '╚══════════════════════════╝',
    '',
  ];

  for (const line of lines) {
    logger.info(line);
  }
}

function registerShutdownHandlers(
  logger: ReturnType<typeof createLogger>,
  client: ReturnType<typeof createDiscordClient>,
  moduleLoader: ModuleLoader,
  databaseAdapter: SupabaseAdapter,
  eventBus: EventBus,
  apiServer: ReturnType<typeof createAPIHttpServer>,
): () => Promise<void> {
  const shutdown = async () => {
    if (shuttingDown) return;
    shuttingDown = true;

    logger.info('Shutting down...');
    eventBus.emit('system.shutdown');

    try {
      client.destroy();
    } catch (err) {
      logger.error({ error: err }, 'Error destroying Discord client');
    }

    try {
      await moduleLoader.shutdownAll();
    } catch (err) {
      logger.error({ error: err }, 'Error shutting down modules');
    }

    try {
      await apiServer.stop();
    } catch (err) {
      logger.error({ error: err }, 'Error stopping API server');
    }

    try {
      await databaseAdapter.disconnect();
    } catch (err) {
      logger.error({ error: err }, 'Error disconnecting database');
    }

    logger.info('Shutdown complete');
  };

  process.on('SIGINT', () => { void shutdown().then(() => process.exit(0)); });
  process.on('SIGTERM', () => { void shutdown().then(() => process.exit(0)); });

  return shutdown;
}

function registerHealthChecks(
  healthService: HealthService,
  configService: ConfigService,
  db: SupabaseAdapter,
  eventBus: EventBus,
  moduleLoader: ModuleLoader,
  logger: ReturnType<typeof createLogger>,
  metricsService: MetricsService,
): void {
  healthService.registerCheck({
    name: 'config',
    execute: async () => {
      try {
        configService.get();
        return { status: 'healthy', message: 'Configuration loaded' };
      } catch (err) {
        return { status: 'unhealthy', message: err instanceof Error ? err.message : 'Config not loaded' };
      }
    },
  });

  healthService.registerCheck({
    name: 'logger',
    execute: async () => {
      try {
        logger.info('health-check');
        return { status: 'healthy', message: 'Logger operational' };
      } catch (err) {
        return { status: 'unhealthy', message: err instanceof Error ? err.message : 'Logger not operational' };
      }
    },
  });

  healthService.registerCheck({
    name: 'database',
    execute: async () => {
      const result = await db.checkConnection();
      return {
        status: result.success ? 'healthy' : 'unhealthy',
        latencyMs: result.latencyMs,
        message: result.success ? 'Database connected' : result.error,
      };
    },
  });

  healthService.registerCheck({
    name: 'eventBus',
    execute: async () => {
      const count = eventBus.subscriberCount('system.shutdown');
      return {
        status: 'healthy',
        message: `Event Bus operational`,
        metadata: { subscriberCount: count },
      };
    },
  });

  healthService.registerCheck({
    name: 'moduleLoader',
    execute: async () => {
      const loaded = moduleLoader.getLoadedModules().length;
      return {
        status: 'healthy',
        message: `${loaded} modules loaded`,
        metadata: { moduleCount: loaded },
      };
    },
  });

  healthService.registerCheck({
    name: 'metrics',
    execute: async () => {
      const snapshot = metricsService.snapshot();
      return {
        status: 'healthy',
        message: 'Metrics available',
        metadata: {
          commandsExecuted: snapshot.counters['command_execution_total'] ?? 0,
          commandsFailed: snapshot.counters['command_failed_total'] ?? 0,
          moderationActions: snapshot.counters['moderation_action_total'] ?? 0,
          voiceJoins: snapshot.counters['voice_join_total'] ?? 0,
          voiceErrors: snapshot.counters['voice_error_total'] ?? 0,
        },
      };
    },
  });
}
