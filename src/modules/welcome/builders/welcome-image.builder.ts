import type { ImageService } from '../../../shared/image/image.service.js';

export interface WelcomeImageInput {
  username: string;
  avatarUrl: string;
  backgroundUrl: string;
  title: string;
  subtitle: string;
}

export class WelcomeImageBuilder {
  private static readonly WIDTH = 800;
  private static readonly HEIGHT = 450;
  private static readonly AVATAR_SIZE = 128;
  private static readonly AVATAR_Y = 72;
  private static readonly BORDER_WIDTH = 4;

  private static readonly SHADOW = {
    color: 'rgba(0, 0, 0, 0.35)',
    offsetX: 0,
    offsetY: 4,
    blur: 12,
  };

  private static readonly TEXT_SHADOW = {
    color: 'rgba(0, 0, 0, 0.5)',
    offsetX: 1,
    offsetY: 2,
    blur: 4,
  };

  constructor(private readonly imageService: ImageService) {}

  async build(input: WelcomeImageInput): Promise<Buffer> {
    const canvas = this.imageService.createCanvas(WelcomeImageBuilder.WIDTH, WelcomeImageBuilder.HEIGHT);
    const ctx = canvas.getContext('2d');

    await this.drawBackground(ctx, input.backgroundUrl);

    this.drawOverlay(ctx);

    await this.drawAvatar(ctx, input.avatarUrl);

    this.drawTitle(ctx, input.title);

    this.drawUsername(ctx, input.username);

    this.drawSubtitle(ctx, input.subtitle);

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
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(0, 0, WelcomeImageBuilder.WIDTH, WelcomeImageBuilder.HEIGHT);
    ctx.restore();
  }

  private async drawAvatar(
    ctx: ReturnType<ReturnType<ImageService['createCanvas']>['getContext']>,
    avatarUrl: string,
  ): Promise<void> {
    const avatar = await this.imageService.loadAsset(avatarUrl);
    const cx = WelcomeImageBuilder.WIDTH / 2;
    const cy = WelcomeImageBuilder.AVATAR_Y + WelcomeImageBuilder.AVATAR_SIZE / 2;
    const radius = WelcomeImageBuilder.AVATAR_SIZE / 2;

    ctx.save();
    ctx.shadowColor = WelcomeImageBuilder.SHADOW.color;
    ctx.shadowOffsetX = WelcomeImageBuilder.SHADOW.offsetX;
    ctx.shadowOffsetY = WelcomeImageBuilder.SHADOW.offsetY;
    ctx.shadowBlur = WelcomeImageBuilder.SHADOW.blur;

    ctx.beginPath();
    ctx.arc(cx, cy, radius + WelcomeImageBuilder.BORDER_WIDTH, 0, Math.PI * 2);
    ctx.closePath();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = WelcomeImageBuilder.BORDER_WIDTH;
    ctx.stroke();

    ctx.shadowColor = 'rgba(0, 0, 0, 0)';
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.shadowBlur = 0;

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, cx - radius, cy - radius, WelcomeImageBuilder.AVATAR_SIZE, WelcomeImageBuilder.AVATAR_SIZE);

    ctx.restore();
  }

  private drawTitle(
    ctx: ReturnType<ReturnType<ImageService['createCanvas']>['getContext']>,
    title: string,
  ): void {
    const y = WelcomeImageBuilder.AVATAR_Y + WelcomeImageBuilder.AVATAR_SIZE + 60;
    this.imageService.drawText(
      ctx,
      title,
      'bold 40px sans-serif',
      WelcomeImageBuilder.WIDTH / 2,
      y,
      WelcomeImageBuilder.WIDTH - 80,
      'center',
      '#ffffff',
      WelcomeImageBuilder.TEXT_SHADOW,
    );
  }

  private drawUsername(
    ctx: ReturnType<ReturnType<ImageService['createCanvas']>['getContext']>,
    username: string,
  ): void {
    const y = WelcomeImageBuilder.AVATAR_Y + WelcomeImageBuilder.AVATAR_SIZE + 110;
    this.imageService.drawText(
      ctx,
      username,
      '30px sans-serif',
      WelcomeImageBuilder.WIDTH / 2,
      y,
      WelcomeImageBuilder.WIDTH - 80,
      'center',
      '#eeeeee',
      WelcomeImageBuilder.TEXT_SHADOW,
    );
  }

  private drawSubtitle(
    ctx: ReturnType<ReturnType<ImageService['createCanvas']>['getContext']>,
    subtitle: string,
  ): void {
    const y = WelcomeImageBuilder.AVATAR_Y + WelcomeImageBuilder.AVATAR_SIZE + 148;
    this.imageService.drawText(
      ctx,
      subtitle,
      '22px sans-serif',
      WelcomeImageBuilder.WIDTH / 2,
      y,
      WelcomeImageBuilder.WIDTH - 80,
      'center',
      '#aaaaaa',
      WelcomeImageBuilder.TEXT_SHADOW,
    );
  }
}
