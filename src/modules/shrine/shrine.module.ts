import type { IModule } from '../module.interface.js';
import type { IContainer } from '../../core/container/types.js';
import { TOKENS } from '../../core/container/tokens.js';
import type { IEventBus } from '../../core/event-bus/types.js';
import type { ILogger } from '../../core/logger/logger.service.js';
import { ImageService } from '../../shared/image/image.service.js';
import { ShrineCardRenderer } from './canvas/ShrineCardRenderer.js';
import { ShrineClient } from './services/shrine.client.js';
import { ShrinePollingScheduler } from './services/shrine-polling.scheduler.js';
import { ShrineService } from './services/shrine.service.js';
import { shrineManifest } from './manifest.js';
import { createShrineSettings } from './settings.js';

export class ShrineModule implements IModule {
  readonly name = 'shrine';
  readonly version = '3.2.1';
  readonly enabled = true;
  readonly manifest = shrineManifest;

  private scheduler: ShrinePollingScheduler | null = null;
  private clientReady = false;
  private schedulerStarted = false;
  private logger: ILogger | null = null;

  register(container: IContainer): void {
    const configurationService = container.resolve(TOKENS.ConfigurationService);
    const config = configurationService.current();
    const logger = container.resolve(TOKENS.Logger);
    const client = container.resolve(TOKENS.DiscordClient);
    const eventBus = container.resolve(TOKENS.EventBus);
    this.logger = logger;

    if (container.has(TOKENS.SettingsRegistry)) {
      container.resolve(TOKENS.SettingsRegistry).register(this.name, createShrineSettings(config));
    }

    const shrineClient = new ShrineClient(
      {
        baseUrl: config.bot.shrine.nightLightBaseUrl,
        retries: 2,
        retryDelayMs: 1000,
        timeoutMs: 10000,
      },
      logger,
    );
    const cardRenderer = new ShrineCardRenderer(new ImageService(logger));

    const shrineService = new ShrineService(
      client,
      configurationService,
      shrineClient,
      cardRenderer,
      logger,
      container.resolve(TOKENS.MetricsService),
      eventBus,
    );

    this.scheduler = new ShrinePollingScheduler(shrineService, logger, config.bot.shrine);
    this.registerReadyHandler(eventBus, logger);
    this.clientReady = client.isReady();

    logger.info({ enabled: config.bot.shrine.enabled }, 'Shrine module registered');
  }

  async onStart(): Promise<void> {
    if (this.clientReady) {
      this.startScheduler();
      return;
    }

    this.logger?.info('Shrine scheduler waiting for Discord client ready');
  }

  async onShutdown(): Promise<void> {
    this.scheduler?.stop();
  }

  private registerReadyHandler(eventBus: IEventBus, logger: ILogger): void {
    eventBus.subscribe('bot.ready', () => {
      this.clientReady = true;
      logger.info('Discord client ready; starting Shrine scheduler');
      this.startScheduler();
    });
  }

  private startScheduler(): void {
    if (this.schedulerStarted) {
      return;
    }

    this.schedulerStarted = true;
    this.scheduler?.start();
  }
}
