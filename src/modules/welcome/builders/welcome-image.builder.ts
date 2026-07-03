import type { ImageService } from '../../../shared/image/image.service.js';

export interface WelcomeImageInput {
  username: string;
  avatarUrl: string;
  backgroundUrl: string;
  guildName: string;
  memberCount: number;
  title: string;
  subtitle: string;
}

export class WelcomeImageBuilder {
  private static readonly WIDTH = 800;
  private static readonly HEIGHT = 450;
  private static readonly AVATAR_SIZE = 128;
  private static readonly AVATAR_Y = 80;

  constructor(private readonly imageService: ImageService) {}

  async build(input: WelcomeImageInput): Promise<Buffer> {
    const canvas = this.imageService.createCanvas(WelcomeImageBuilder.WIDTH, WelcomeImageBuilder.HEIGHT);
    const ctx = canvas.getContext('2d');

    await this.drawBackground(ctx, input.backgroundUrl);

    this.drawOverlay(ctx);

    await this.drawAvatar(ctx, input.avatarUrl);

    this.drawUsername(ctx, input.username);

    this.drawGuildName(ctx, input.guildName, input.memberCount, input.title, input.subtitle);

    return canvas.encodeSync('png');
  }

  private async drawBackground(
    ctx: ReturnType<ReturnType<ImageService['createCanvas']>['getContext']>,
    backgroundUrl: string,
  ): Promise<void> {
    const bg = await this.imageService.loadAsset(backgroundUrl);
    ctx.drawImage(bg, 0, 0, WelcomeImageBuilder.WIDTH, WelcomeImageBuilder.HEIGHT);
  }

  private drawOverlay(
    ctx: ReturnType<ReturnType<ImageService['createCanvas']>['getContext']>,
  ): void {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(0, 0, WelcomeImageBuilder.WIDTH, WelcomeImageBuilder.HEIGHT);
  }

  private async drawAvatar(
    ctx: ReturnType<ReturnType<ImageService['createCanvas']>['getContext']>,
    avatarUrl: string,
  ): Promise<void> {
    const avatar = await this.imageService.loadAsset(avatarUrl);
    const x = (WelcomeImageBuilder.WIDTH - WelcomeImageBuilder.AVATAR_SIZE) / 2;
    this.imageService.drawRoundedImage(ctx, avatar, x, WelcomeImageBuilder.AVATAR_Y, WelcomeImageBuilder.AVATAR_SIZE, 64);
  }

  private drawUsername(
    ctx: ReturnType<ReturnType<ImageService['createCanvas']>['getContext']>,
    username: string,
  ): void {
    this.imageService.drawText(
      ctx,
      username,
      '32px sans-serif',
      WelcomeImageBuilder.WIDTH / 2,
      WelcomeImageBuilder.AVATAR_Y + WelcomeImageBuilder.AVATAR_SIZE + 50,
      WelcomeImageBuilder.WIDTH - 80,
      'center',
      '#ffffff',
    );
  }

  private drawGuildName(
    ctx: ReturnType<ReturnType<ImageService['createCanvas']>['getContext']>,
    guildName: string,
    memberCount: number,
    title: string,
    subtitle: string,
  ): void {
    const resolvedTitle = title.replace('{server}', guildName).replace('{count}', String(memberCount));
    const resolvedSubtitle = subtitle.replace('{server}', guildName).replace('{count}', String(memberCount));

    this.imageService.drawText(
      ctx,
      resolvedTitle,
      '24px sans-serif',
      WelcomeImageBuilder.WIDTH / 2,
      WelcomeImageBuilder.AVATAR_Y + WelcomeImageBuilder.AVATAR_SIZE + 90,
      WelcomeImageBuilder.WIDTH - 80,
      'center',
      '#cccccc',
    );

    this.imageService.drawText(
      ctx,
      resolvedSubtitle,
      '20px sans-serif',
      WelcomeImageBuilder.WIDTH / 2,
      WelcomeImageBuilder.AVATAR_Y + WelcomeImageBuilder.AVATAR_SIZE + 120,
      WelcomeImageBuilder.WIDTH - 80,
      'center',
      '#aaaaaa',
    );
  }
}
