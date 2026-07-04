import type { IModule } from '../module.interface.js';
import type { IContainer } from '../../core/container/types.js';
import { TOKENS } from '../../core/container/tokens.js';
import { ImageService } from '../../shared/image/image.service.js';
import { TemplateService } from '../../shared/template/template.service.js';
import { WelcomeService } from './services/welcome.service.js';
import { welcomeManifest } from './manifest.js';
import { createWelcomeSettings } from './settings.js';

export class WelcomeModule implements IModule {
  readonly name = 'welcome';
  readonly version = '1.0.0';
  readonly enabled = true;
  readonly manifest = welcomeManifest;

  private welcomeService: WelcomeService | null = null;

  register(container: IContainer): void {
    const config = container.resolve(TOKENS.ConfigurationService).current();
    const logger = container.resolve(TOKENS.Logger);
    const client = container.resolve(TOKENS.DiscordClient);
    const metrics = container.resolve(TOKENS.MetricsService);

    if (container.has(TOKENS.SettingsRegistry)) {
      container.resolve(TOKENS.SettingsRegistry).register(this.name, createWelcomeSettings(config));
    }

    if (!config.bot.welcome.enabled) {
      logger.info('Welcome module disabled via config');
      return;
    }

    const imageService = new ImageService(logger);
    const templateService = new TemplateService();

    this.welcomeService = new WelcomeService(
      client,
      config.bot.welcome,
      imageService,
      templateService,
      logger,
      metrics,
    );
    this.welcomeService.register();

    logger.info('Welcome module registered');
  }
}
