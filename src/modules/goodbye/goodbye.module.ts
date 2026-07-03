import type { IModule } from '../module.interface.js';
import type { IContainer } from '../../core/container/types.js';
import { TOKENS } from '../../core/container/tokens.js';
import { ImageService } from '../../shared/image/image.service.js';
import { TemplateService } from '../../shared/template/template.service.js';
import { GoodbyeService } from './services/goodbye.service.js';

export class GoodbyeModule implements IModule {
  readonly name = 'goodbye';
  readonly version = '1.0.0';
  readonly enabled = true;

  private goodbyeService: GoodbyeService | null = null;

  register(container: IContainer): void {
    const config = container.resolve(TOKENS.AppConfig);
    const logger = container.resolve(TOKENS.Logger);
    const client = container.resolve(TOKENS.DiscordClient);
    const metrics = container.resolve(TOKENS.MetricsService);

    if (!config.bot.goodbye.enabled) {
      logger.info('Goodbye module disabled via config');
      return;
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

    logger.info('Goodbye module registered');
  }
}
