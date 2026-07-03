import type { IModule } from '../module.interface.js';
import type { IContainer } from '../../core/container/types.js';
import { TOKENS } from '../../core/container/tokens.js';
import { ImageService } from '../../shared/image/image.service.js';
import { WelcomeService } from './services/welcome.service.js';

export class WelcomeModule implements IModule {
  readonly name = 'welcome';
  readonly version = '1.0.0';
  readonly enabled = true;

  private welcomeService: WelcomeService | null = null;

  register(container: IContainer): void {
    const config = container.resolve(TOKENS.AppConfig);
    const logger = container.resolve(TOKENS.Logger);
    const client = container.resolve(TOKENS.DiscordClient);
    const metrics = container.resolve(TOKENS.MetricsService);

    if (!config.bot.welcome.enabled) {
      logger.info('Welcome module disabled via config');
      return;
    }

    const imageService = new ImageService(logger);

    this.welcomeService = new WelcomeService(client, config.bot.welcome, imageService, logger, metrics);
    this.welcomeService.register();

    logger.info('Welcome module registered');
  }
}
