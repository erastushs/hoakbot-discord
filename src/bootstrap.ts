import { pino } from 'pino';
import { ConfigService } from './core/config/config.service.js';
import { createLogger } from './core/logger/logger.service.js';
import { Container } from './core/container/container.js';
import { TOKENS } from './core/container/tokens.js';
import { ModuleLoader } from './modules/module-loader.js';
import { EventBus } from './core/event-bus/event-bus.js';
import { SupabaseAdapter } from './core/database/supabase.adapter.js';
import { HealthService } from './core/health/health.service.js';
import { MetricsService } from './core/metrics/metrics.service.js';

const bootstrapLogger = pino({
  level: 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true, translateTime: 'HH:MM:ss.l', ignore: 'pid,hostname' },
  },
});

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

  // Track initial metrics
  metricsService.gauge('guild_count').set(1);
  metricsService.gauge('module_count').set(0);

  logger.info('Connecting to database...');
  const dbTimer = metricsService.timer('database.connect');
  dbTimer.start();
  const databaseAdapter = new SupabaseAdapter(appConfig, logger);
  await databaseAdapter.connect();
  dbTimer.stop();
  container.registerSingleton(TOKENS.DatabaseAdapter, () => databaseAdapter);

  logger.info('Loading modules...');
  const moduleLoader = new ModuleLoader(logger, appConfig.featureFlags.modules);

  // Modules will be registered here in later phases
  // moduleLoader.registerModule(new GeneralModule());
  // moduleLoader.registerModule(new VoiceModule());
  // moduleLoader.registerModule(new ModerationModule());

  await moduleLoader.loadAll(container);
  await moduleLoader.startAll();
  metricsService.gauge('module_count').set(moduleLoader.getLoadedModules().length);

  logger.info('Running health checks...');
  const healthTimer = metricsService.timer('health');
  healthTimer.start();
  registerHealthChecks(healthService, configService, databaseAdapter, eventBus, moduleLoader, logger);
  const report = await healthService.runAll();
  healthTimer.stop();

  startupTimer.stop();
  const snapshot = metricsService.snapshot();
  logger.info(
    {
      nodeVersion: process.version,
      moduleCount: moduleLoader.getLoadedModules().length,
      healthStatus: report.status,
      startupMs: Math.round(startupTimer.duration()),
      healthMs: Math.round(healthTimer.duration()),
      metrics: snapshot,
    },
    'Hoak Bot started',
  );
} catch (err) {
  bootstrapLogger.fatal({ error: err }, 'Failed to start Hoak Bot');
  process.exit(1);
}

function registerHealthChecks(
  healthService: HealthService,
  configService: ConfigService,
  db: SupabaseAdapter,
  eventBus: EventBus,
  moduleLoader: ModuleLoader,
  logger: ReturnType<typeof createLogger>,
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
}
