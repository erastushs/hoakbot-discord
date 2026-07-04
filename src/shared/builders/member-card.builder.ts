import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import type { ImageService } from '../image/image.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DEFAULT_BG_PATH = resolve(__dirname, '../../../assets/images/default-welcome-bg.png');

export interface MemberCardInput {
  username: string;
  avatarUrl: string;
  backgroundUrl: string;
  title: string;
  subtitle: string;
}

const FONT_FAMILY = '"Noto Sans", "Noto Sans CJK JP", "Noto Color Emoji", sans-serif';

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
    y: 240,
    fontSize: 52,
    color: '#ffffff',
  },
  username: {
    y: 300,
    fontSize: 36,
    minFontSize: 14,
    color: '#FFC107',
  },
  subtitle: {
    y: 348,
    fontSize: 22,
    color: '#ffffff',
  },
  textShadow: {
    color: 'rgba(0, 0, 0, 0.7)',
    offsetX: 0,
    offsetY: 3,
    blur: 8,
  },
  placeholderAvatarBg: '#4a5568',
  placeholderAvatarInitials: '#ffffff',
} as const;

function fontString(size: number, weight: 'bold' | 'normal' = 'bold'): string {
  return `${weight} ${size}px ${FONT_FAMILY}`;
}

export class MemberCardBuilder {
  constructor(private readonly imageService: ImageService) {}

  async build(input: MemberCardInput): Promise<Buffer> {
    const canvas = this.imageService.createCanvas(LAYOUT.width, LAYOUT.height);
    const ctx = canvas.getContext('2d');

    await this.drawBackground(ctx, input.backgroundUrl);

    await this.drawAvatar(ctx, input.avatarUrl, input.username);

    this.drawTitle(ctx, input.title);

    this.drawUsername(ctx, input.username);

    this.drawSubtitle(ctx, input.subtitle);

    return canvas.encodeSync('png');
  }

  private async drawBackground(
    ctx: ReturnType<ReturnType<ImageService['createCanvas']>['getContext']>,
    backgroundUrl: string,
  ): Promise<void> {
    try {
      const bg = await this.imageService.loadAsset(backgroundUrl);
      ctx.drawImage(bg, 0, 0, LAYOUT.width, LAYOUT.height);
      return;
    } catch {
      this.imageService.warn({ url: backgroundUrl }, 'Failed to load background image, trying bundled default');
    }

    try {
      const fallback = await this.imageService.loadAsset(DEFAULT_BG_PATH);
      ctx.drawImage(fallback, 0, 0, LAYOUT.width, LAYOUT.height);
    } catch {
      this.imageService.warn({ path: DEFAULT_BG_PATH }, 'Bundled default background also failed, rendering solid color');
      const gradient = ctx.createLinearGradient(0, 0, 0, LAYOUT.height);
      gradient.addColorStop(0, '#1a1a2e');
      gradient.addColorStop(1, '#16213e');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, LAYOUT.width, LAYOUT.height);
    }
  }

  private async drawAvatar(
    ctx: ReturnType<ReturnType<ImageService['createCanvas']>['getContext']>,
    avatarUrl: string,
    username?: string,
  ): Promise<void> {
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

    try {
      const avatar = await this.imageService.loadAsset(avatarUrl);
      ctx.drawImage(avatar, cx - radius, cy - radius, LAYOUT.avatar.size, LAYOUT.avatar.size);
    } catch {
      ctx.fillStyle = LAYOUT.placeholderAvatarBg;
      ctx.fillRect(cx - radius, cy - radius, LAYOUT.avatar.size, LAYOUT.avatar.size);

      const initial = this.deriveInitial(username);
      ctx.fillStyle = LAYOUT.placeholderAvatarInitials;
      ctx.font = fontString(48, 'normal');
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(initial, cx, cy);
    }

    ctx.restore();
  }

  private drawTitle(
    ctx: ReturnType<ReturnType<ImageService['createCanvas']>['getContext']>,
    title: string,
  ): void {
    this.imageService.drawText(
      ctx,
      title,
      fontString(LAYOUT.title.fontSize),
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
    const maxWidth = LAYOUT.width - 80;
    let size = LAYOUT.username.fontSize;

    ctx.save();
    ctx.font = fontString(size);
    while (ctx.measureText(username).width > maxWidth && size > LAYOUT.username.minFontSize) {
      size -= 1;
      ctx.font = fontString(size);
    }
    const adaptedFont = ctx.font;
    ctx.restore();

    this.imageService.drawText(
      ctx,
      username,
      adaptedFont,
      LAYOUT.width / 2,
      LAYOUT.username.y,
      maxWidth,
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
      fontString(LAYOUT.subtitle.fontSize),
      LAYOUT.width / 2,
      LAYOUT.subtitle.y,
      LAYOUT.width - 80,
      'center',
      LAYOUT.subtitle.color,
      LAYOUT.textShadow,
    );
  }

  private deriveInitial(username?: string): string {
    if (username && username.length > 0) {
      return [...username][0]?.toUpperCase() ?? '?';
    }
    return '?';
  }
}
