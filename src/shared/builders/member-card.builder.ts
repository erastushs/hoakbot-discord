import type { ImageService } from '../../shared/image/image.service.js';

export interface MemberCardInput {
  username: string;
  avatarUrl: string;
  backgroundUrl: string;
  title: string;
  subtitle: string;
}

const LAYOUT = {
  width: 800,
  height: 450,
  avatar: {
    size: 144,
    y: 44,
    borderWidth: 6,
    shadow: {
      color: 'rgba(0, 0, 0, 0.4)',
      offsetX: 0,
      offsetY: 4,
      blur: 16,
    },
  },
  title: {
    y: 258,
    fontSize: 'bold 70px sans-serif',
    color: '#ffffff',
  },
  username: {
    y: 326,
    fontSize: 'bold 36px sans-serif',
    color: '#FFC107',
  },
  subtitle: {
    y: 374,
    fontSize: 'bold 26px sans-serif',
    color: '#ffffff',
  },
  textShadow: {
    color: 'rgba(0, 0, 0, 0.7)',
    offsetX: 0,
    offsetY: 3,
    blur: 8,
  },
} as const;

export class MemberCardBuilder {
  constructor(private readonly imageService: ImageService) {}

  async build(input: MemberCardInput): Promise<Buffer> {
    const canvas = this.imageService.createCanvas(LAYOUT.width, LAYOUT.height);
    const ctx = canvas.getContext('2d');

    await this.drawBackground(ctx, input.backgroundUrl);

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
    ctx.drawImage(bg, 0, 0, LAYOUT.width, LAYOUT.height);
  }

  private async drawAvatar(
    ctx: ReturnType<ReturnType<ImageService['createCanvas']>['getContext']>,
    avatarUrl: string,
  ): Promise<void> {
    const avatar = await this.imageService.loadAsset(avatarUrl);
    const cx = LAYOUT.width / 2;
    const radius = LAYOUT.avatar.size / 2;
    const cy = LAYOUT.avatar.y + radius;

    ctx.save();

    ctx.shadowColor = LAYOUT.avatar.shadow.color;
    ctx.shadowOffsetX = LAYOUT.avatar.shadow.offsetX;
    ctx.shadowOffsetY = LAYOUT.avatar.shadow.offsetY;
    ctx.shadowBlur = LAYOUT.avatar.shadow.blur;

    ctx.beginPath();
    ctx.arc(cx, cy, radius + LAYOUT.avatar.borderWidth, 0, Math.PI * 2);
    ctx.closePath();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = LAYOUT.avatar.borderWidth;
    ctx.stroke();

    ctx.shadowColor = 'rgba(0, 0, 0, 0)';
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.shadowBlur = 0;

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, cx - radius, cy - radius, LAYOUT.avatar.size, LAYOUT.avatar.size);

    ctx.restore();
  }

  private drawTitle(
    ctx: ReturnType<ReturnType<ImageService['createCanvas']>['getContext']>,
    title: string,
  ): void {
    this.imageService.drawText(
      ctx,
      title,
      LAYOUT.title.fontSize,
      LAYOUT.width / 2,
      LAYOUT.title.y,
      LAYOUT.width - 80,
      'center',
      LAYOUT.title.color,
      LAYOUT.textShadow,
    );
  }

  private drawUsername(
    ctx: ReturnType<ReturnType<ImageService['createCanvas']>['getContext']>,
    username: string,
  ): void {
    this.imageService.drawText(
      ctx,
      username,
      LAYOUT.username.fontSize,
      LAYOUT.width / 2,
      LAYOUT.username.y,
      LAYOUT.width - 80,
      'center',
      LAYOUT.username.color,
      LAYOUT.textShadow,
    );
  }

  private drawSubtitle(
    ctx: ReturnType<ReturnType<ImageService['createCanvas']>['getContext']>,
    subtitle: string,
  ): void {
    this.imageService.drawText(
      ctx,
      subtitle.toUpperCase(),
      LAYOUT.subtitle.fontSize,
      LAYOUT.width / 2,
      LAYOUT.subtitle.y,
      LAYOUT.width - 80,
      'center',
      LAYOUT.subtitle.color,
      LAYOUT.textShadow,
    );
  }
}
