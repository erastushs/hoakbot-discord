import { pino } from 'pino';
import { ConfigService } from './core/config/config.service.js';
import { ConfigurationService } from './core/config/configuration.service.js';
import { DatabaseConfigProvider } from './core/config/database-config.provider.js';
import { GuildSettingsRepository } from './core/config/guild-settings.repository.js';
import { DatabaseGuildModuleStateRepository } from './core/config/guild-module-state.repository.js';
import { DashboardStateEvents } from './core/api/dashboard-state.events.js';
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
  createLogsEndpoints,
  createModuleConfigEndpoints,
  createRateLimitMiddleware,
  createSecurityAuditMiddleware,
  createSecurityHeadersMiddleware,
  createSessionAuthMiddleware,
  CsrfService,
  dashboardRateLimitRules,
  ok,
  RateLimiter,
  SecurityAuditService,
} from './core/api/index.js';
import { LogsService } from './core/logs/logs.service.js';
import {
  AuthorizationProvider,
  ClientGuildDataSource,
  DatabaseSessionProvider,
  DiscordOAuthProvider,
  FetchDiscordAPIClient,
  GuildResolver,
  OAuthStateService,
  SessionCleanupScheduler,
  SessionCleanupService,
  SessionRepository,
} from './core/auth/index.js';
import { SettingsRegistry } from './core/settings/settings-registry.js';
import { ModuleLoader } from './modules/module-loader.js';
import { ManifestRegistry } from './modules/manifest-registry.js';
import { ModuleRegistry } from './modules/module-registry.js';
import { EventBus } from './core/event-bus/event-bus.js';
import { EventCoordinator, EventRegistry } from './core/event-bus/event-registry.js';
import { ConfigurationEventSourceAdapter, DiscordEventSourceAdapter, EventSourceCoordinator, InternalEventSourceAdapter } from './core/event-bus/source-adapters.js';
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
import { ShrineModule } from './modules/shrine/shrine.module.js';
import { CommandRegistry } from './shared/command-registry.js';
import type { HealthReport } from './core/health/types.js';
import { createBuiltInRuntimeCatalog, generatedBuiltInPluginCatalog } from './modules/built-in-plugin-catalog.js';
import { projectPluginModules } from './modules/plugin-compatibility.js';
import {
  loadAndStartPluginCatalog,
  PluginMigrationRunner,
  PluginRegistry,
  PostgresMigrationStore,
  PluginLifecycleCoordinator,
} from './plugin-core/index.js';
import { ConfigurationHotReloadCoordinator } from './core/config/hot-reload.coordinator.js';
import type { IModule } from './modules/module.interface.js';
import { createGeneralSettings } from './modules/general/settings.js';
import { createVoiceSettings } from './modules/voice/settings.js';
import { createModerationSettings } from './modules/moderation/settings.js';
import { createLoggingSettings } from './modules/logging/settings.js';
import { createWelcomeSettings } from './modules/welcome/settings.js';
import { createGoodbyeSettings } from './modules/goodbye/settings.js';
import { createShrineSettings } from './modules/shrine/settings.js';
import type { AppConfig } from './core/config/types.js';

export function registerBuiltInSettings(registry: SettingsRegistry, config: Readonly<AppConfig>): void {
  registry.register('general', createGeneralSettings(config));
  registry.register('voice', createVoiceSettings(config));
  registry.register('moderation', createModerationSettings(config));
  registry.register('logging', createLoggingSettings(config));
  registry.register('welcome', createWelcomeSettings(config));
  registry.register('goodbye', createGoodbyeSettings(config));
  registry.register('shrine', createShrineSettings(config));
}

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
  const logsService = new LogsService();
  const logger = createLogger(configService, logsService);

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

  const compatibilityRollback = appConfig.featureFlags.pluginConfigRollback;
  const settingsRegistry = new SettingsRegistry(appConfig.featureFlags.pluginConfigOwnership && !compatibilityRollback);
  registerBuiltInSettings(settingsRegistry, appConfig);
  const manifestRegistry = new ManifestRegistry();
  const moduleRegistry = new ModuleRegistry();
  const apiRouter = new APIRouter();
  const guildSettingsRepository = new GuildSettingsRepository(databaseAdapter);
  const guildModuleStates = new DatabaseGuildModuleStateRepository(databaseAdapter);
  const dashboardStateEvents = new DashboardStateEvents();
  const configProvider = new DatabaseConfigProvider(
    guildSettingsRepository,
    new JsonConfigProvider(),
    settingsRegistry,
  );
  const hotReload = new ConfigurationHotReloadCoordinator({
    enabled: appConfig.featureFlags.pluginConfigHotReload && !compatibilityRollback,
  });
  healthService.registerCheck(hotReload.createHealthCheck());
  const configurationService = new ConfigurationService(
    configProvider,
    settingsRegistry,
    eventBus,
    appConfig,
    hotReload,
    appConfig.featureFlags.pluginConfigOwnership && !compatibilityRollback,
  );
  const pluginContextServices = {
    logger: () => ({
      log: (level: string, message: string, metadata?: unknown) => logger.info({ level, metadata }, message),
    }),
    config: (ownerId: string, key: string, guildId?: string) => configurationService.getOwned(ownerId, key, guildId),
    event: () => {
      throw new Error('Event capability is unavailable.');
    },
    command: () => {
      throw new Error('Command capability is unavailable.');
    },
    api: () => {
      throw new Error('API capability is unavailable.');
    },
    health: () => {
      throw new Error('Health capability is unavailable.');
    },
    hotReload: (
      ownerId: string,
      handler: Parameters<ConfigurationHotReloadCoordinator['register']>[1],
      guildId?: string,
    ) => hotReload.register(ownerId, handler, guildId),
  };
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
  const sessionCleanupScheduler = new SessionCleanupScheduler(new SessionCleanupService(sessionRepository), logger, {
    intervalMs: appConfig.session?.cleanupIntervalMs ?? 1000 * 60 * 60,
  });
  const csrfService = new CsrfService({ tokenTtlMs: sessionConfig.durationMs });
  const rateLimiter = new RateLimiter();
  const securityAudit = new SecurityAuditService(logger);
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

  const { eventCatalog, eventCatalogHash } = await import('./generated/event-catalog.js');
  const { validateGeneratedEventCatalog } = await import('./core/event-bus/validate-catalog.js');
  validateGeneratedEventCatalog(eventCatalog, eventCatalogHash);
  const eventRegistry = new EventRegistry();
  const eventCoordinator = new EventCoordinator(eventRegistry, (diagnostic) => {
    metricsService.counter(`plugin_event_${diagnostic.code.replaceAll('.', '_')}_total`).increment();
    logger.warn({ event: diagnostic.event, owner: diagnostic.owner, error: diagnostic.error }, 'Declarative event diagnostic');
  });
  const sourceCoordinator = new EventSourceCoordinator({
    internal: new InternalEventSourceAdapter(eventBus, eventCoordinator),
    configuration: new ConfigurationEventSourceAdapter(eventBus, eventCoordinator),
    discord: new DiscordEventSourceAdapter(client, eventCoordinator, {
      'discord.interaction_create': 'interactionCreate',
      'discord.message_create': 'messageCreate',
      'discord.guild_member_add': 'guildMemberAdd',
      'discord.guild_member_remove': 'guildMemberRemove',
      'discord.voice_state_update': 'voiceStateUpdate',
      'discord.guild_member_update': 'guildMemberUpdate',
      'discord.message_delete': 'messageDelete',
      'discord.message_update': 'messageUpdate',
      'discord.message_bulk_delete': 'messageDeleteBulk',
    }),
  });
  let pluginLifecycle: PluginLifecycleCoordinator | undefined;
  let builtInModules: IModule[];
  const pluginRegistry = new PluginRegistry();
  const migrationRunner = new PluginMigrationRunner(new PostgresMigrationStore(databaseAdapter.getClient()));
  const eventLifecycle = new PluginLifecycleCoordinator({ events: eventCoordinator, sources: sourceCoordinator, eventMode: appConfig.featureFlags.pluginEventsRollback ? 'legacy' : 'declarative' });
  if (appConfig.featureFlags.pluginCoreBootstrap) {
    const started = await loadAndStartPluginCatalog(generatedBuiltInPluginCatalog, pluginRegistry, {
      container,
      migrationRunner,
      lifecycle: eventLifecycle,
      eventMode: appConfig.featureFlags.pluginEventsRollback ? 'legacy' : 'declarative',
      services: pluginContextServices,
    });
    pluginLifecycle = started.lifecycle;
    builtInModules = projectPluginModules(started.snapshot);
    logger.info({ pluginIds: [...started.snapshot.keys()] }, 'Built-in modules selected through plugin-core bootstrap');
  } else if (Object.entries(appConfig.featureFlags).some(([key, enabled]) => key.endsWith('Plugin') && enabled)) {
    const started = await loadAndStartPluginCatalog(
      createBuiltInRuntimeCatalog(appConfig.featureFlags),
      pluginRegistry,
      { container, migrationRunner, lifecycle: eventLifecycle, eventMode: appConfig.featureFlags.pluginEventsRollback ? 'legacy' : 'declarative', services: pluginContextServices },
    );
    pluginLifecycle = started.lifecycle;
    builtInModules = projectPluginModules(started.snapshot);
  } else {
    builtInModules = [
      new GeneralModule(),
      new VoiceModule(),
      new ModerationModule(),
      new LoggingModule(),
      new WelcomeModule(),
      new GoodbyeModule(),
      new ShrineModule(),
    ];
  }
  for (const module of builtInModules) {
    if (!module.manifest) throw new Error(`Built-in module "${module.name}" has no manifest.`);
    manifestRegistry.register(module.manifest);
    moduleRegistry.register(module);
    moduleLoader.registerModule(module);
  }

  await moduleLoader.loadAll(container);
  apiRouter.use(createSecurityHeadersMiddleware());
  apiRouter.use(createSecurityAuditMiddleware({ audit: securityAudit }));
  apiRouter.use(createRateLimitMiddleware({ limiter: rateLimiter, rules: dashboardRateLimitRules, logger }));
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
    audit: securityAudit,
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
    audit: securityAudit,
    dashboardProjections: appConfig.featureFlags.pluginDashboard,
    moduleStates: guildModuleStates,
    stateEvents: dashboardStateEvents,
    availableModuleIds: () => new Set(moduleLoader.getLoadedModules().map((module) => module.name)),
  })) {
    apiRouter.register(endpoint);
  }
  for (const endpoint of createLogsEndpoints({ logs: logsService })) {
    apiRouter.register(endpoint);
  }
  await moduleLoader.startAll();
  metricsService.gauge('module_count').set(moduleLoader.getLoadedModules().length);
  const { builtinCommandCatalog } = await import('./generated/command-catalog.js');
  const { validateCompleteCommandCatalog } = await import('./shared/command/validate-catalog.js');
  const completeCatalog = sharedRegistry.catalog();
  if (completeCatalog.length !== builtinCommandCatalog.length)
    throw new Error(
      `Built-in command validation failed: expected ${builtinCommandCatalog.length} commands, found ${completeCatalog.length}.`,
    );
  validateCompleteCommandCatalog(completeCatalog, []);

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
    dashboardStateStream: appConfig.featureFlags.pluginDashboard
      ? {
          path: '/api/v1/dashboard/state/stream',
          events: dashboardStateEvents,
          sessionProvider,
          sessionConfig,
        }
      : undefined,
    logsStream: {
      path: '/api/v1/guilds/:guildId/logs/stream',
      logs: logsService,
      sessionProvider,
      sessionConfig,
      authorizationProvider,
    },
    cors: {
      nodeEnv: appConfig.env.nodeEnv,
      allowedOrigin:
        appConfig.dashboard?.allowedOrigin ?? new URL(appConfig.dashboard?.url ?? 'http://localhost:5173').origin,
    },
    trustProxy: appConfig.trustProxy,
  });
  await apiServer.start();
  sessionCleanupScheduler.start();

  const shutdown = registerShutdownHandlers(
    logger,
    client,
    moduleLoader,
    databaseAdapter,
    eventBus,
    apiServer,
    sessionCleanupScheduler,
    pluginLifecycle,
  );
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
  sessionCleanupScheduler: SessionCleanupScheduler,
  pluginLifecycle?: PluginLifecycleCoordinator,
): () => Promise<void> {
  const shutdown = async () => {
    if (shuttingDown) return;
    shuttingDown = true;

    logger.info('Shutting down...');
    eventBus.emit('system.shutdown');

    sessionCleanupScheduler.stop();

    try {
      await pluginLifecycle?.stop();
    } catch (err) {
      logger.error({ error: err }, 'Error stopping plugins');
    }

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

  process.on('SIGINT', () => {
    void shutdown().then(() => process.exit(0));
  });
  process.on('SIGTERM', () => {
    void shutdown().then(() => process.exit(0));
  });

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
