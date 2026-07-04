import type { IModule } from '../module.interface.js';
import type { IContainer } from '../../core/container/types.js';
import { TOKENS } from '../../core/container/tokens.js';
import { ImageService } from '../../shared/image/image.service.js';
import { TemplateService } from '../../shared/template/template.service.js';
import { GoodbyeService } from './services/goodbye.service.js';
import { goodbyeManifest } from './manifest.js';
import { createGoodbyeSettings } from './settings.js';

export class GoodbyeModule implements IModule {
  readonly name = 'goodbye';
  readonly version = '1.0.0';
  readonly enabled = true;
  readonly manifest = goodbyeManifest;

  private goodbyeService: GoodbyeService | null = null;

  register(container: IContainer): void {
    const config = container.resolve(TOKENS.ConfigurationService).current();
    const logger = container.resolve(TOKENS.Logger);
    const client = container.resolve(TOKENS.DiscordClient);
    const metrics = container.resolve(TOKENS.MetricsService);

    if (container.has(TOKENS.SettingsRegistry)) {
      container.resolve(TOKENS.SettingsRegistry).register(this.name, createGoodbyeSettings(config));
    }

    const imageService = new ImageService(logger);
    const templateService = new TemplateService();

    this.goodbyeService = new GoodbyeService(
      client,
      config.bot.goodbye,
      imageService,
      templateService,
      logger,
      metrics,
    );
    this.goodbyeService.register();

    logger.info({ enabled: config.bot.goodbye.enabled }, 'Goodbye module registered');
  }
}
