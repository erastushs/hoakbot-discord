import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { canvasFont } from '../canvas/fonts.js';
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

const LAYOUT = {
  width: 800,
  height: 450,
  avatar: {
    size: 144,
    y: 44,
    borderWidth: 6,
    accentRingWidth: 2,
    accentRingColor: 'rgba(255, 193, 7, 0.9)',
    shadow: {
      color: 'rgba(0, 0, 0, 0.4)',
      offsetX: 0,
      offsetY: 4,
      blur: 16,
    },
  },
  title: {
    y: 244,
    fontSize: 52,
    fontWeight: 900,
    color: '#ffffff',
  },
  username: {
    y: 309,
    fontSize: 36,
    minFontSize: 14,
    color: '#FFC107',
  },
  subtitle: {
    y: 365,
    fontSize: 24,
    color: '#ffffff',
  },
  textShadow: {
    color: 'rgba(0, 0, 0, 0.95)',
    offsetX: 0,
    offsetY: 3,
    blur: 12,
  },
  textGlow: {
    color: 'rgba(255, 255, 255, 0.18)',
    blur: 4,
  },
  textStroke: {
    color: 'rgba(0, 0, 0, 0.65)',
    width: 1.5,
  },
  placeholderAvatarBg: '#4a5568',
  placeholderAvatarInitials: '#ffffff',
} as const;

export class MemberCardBuilder {
  constructor(private readonly imageService: ImageService) {}

  async build(input: MemberCardInput): Promise<Buffer> {
    const canvas = this.imageService.createCanvas(LAYOUT.width, LAYOUT.height);
    const ctx = canvas.getContext('2d');

    await this.drawBackground(ctx, input.backgroundUrl);
    this.drawBackgroundTreatment(ctx);

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

  private drawBackgroundTreatment(
    ctx: ReturnType<ReturnType<ImageService['createCanvas']>['getContext']>,
  ): void {
    const overlay = ctx.createLinearGradient(0, 0, 0, LAYOUT.height);
    overlay.addColorStop(0, 'rgba(4, 8, 18, 0.28)');
    overlay.addColorStop(0.45, 'rgba(4, 8, 18, 0.38)');
    overlay.addColorStop(1, 'rgba(4, 8, 18, 0.62)');
    ctx.fillStyle = overlay;
    ctx.fillRect(0, 0, LAYOUT.width, LAYOUT.height);

    const vignette = ctx.createRadialGradient(
      LAYOUT.width / 2,
      LAYOUT.height / 2,
      LAYOUT.height * 0.18,
      LAYOUT.width / 2,
      LAYOUT.height / 2,
      LAYOUT.width * 0.58,
    );
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(0.7, 'rgba(0, 0, 0, 0.06)');
    vignette.addColorStop(1, 'rgba(0, 0, 0, 0.48)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, LAYOUT.width, LAYOUT.height);
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
    ctx.arc(cx, cy, radius + LAYOUT.avatar.borderWidth + LAYOUT.avatar.accentRingWidth, 0, Math.PI * 2);
    ctx.closePath();
    ctx.strokeStyle = LAYOUT.avatar.accentRingColor;
    ctx.lineWidth = LAYOUT.avatar.accentRingWidth;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, radius + LAYOUT.avatar.borderWidth / 2, 0, Math.PI * 2);
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
      ctx.font = canvasFont(48, 'normal');
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
    this.drawReadableText(
      ctx,
      title,
      canvasFont(LAYOUT.title.fontSize, LAYOUT.title.fontWeight),
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
    ctx.font = canvasFont(size);
    while (ctx.measureText(username).width > maxWidth && size > LAYOUT.username.minFontSize) {
      size -= 1;
      ctx.font = canvasFont(size);
    }
    const adaptedFont = ctx.font;
    ctx.restore();

    this.drawReadableText(
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
    this.drawReadableText(
      ctx,
      subtitle.toUpperCase(),
      canvasFont(LAYOUT.subtitle.fontSize),
      LAYOUT.width / 2,
      LAYOUT.subtitle.y,
      LAYOUT.width - 80,
      'center',
      LAYOUT.subtitle.color,
      LAYOUT.textShadow,
    );
  }

  private drawReadableText(
    ctx: ReturnType<ReturnType<ImageService['createCanvas']>['getContext']>,
    text: string,
    font: string,
    x: number,
    y: number,
    maxWidth: number,
    align: 'center' | 'left' | 'right',
    color: string,
    shadow: typeof LAYOUT.textShadow,
  ): void {
    ctx.save();
    ctx.font = font;
    ctx.textAlign = align;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = LAYOUT.textStroke.color;
    ctx.lineWidth = LAYOUT.textStroke.width;
    ctx.strokeText(text, x, y, maxWidth);
    ctx.shadowColor = LAYOUT.textGlow.color;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.shadowBlur = LAYOUT.textGlow.blur;
    ctx.fillStyle = color;
    ctx.fillText(text, x, y, maxWidth);
    ctx.restore();

    this.imageService.drawText(ctx, text, font, x, y, maxWidth, align, color, shadow);
  }

  private deriveInitial(username?: string): string {
    if (username && username.length > 0) {
      return [...username][0]?.toUpperCase() ?? '?';
    }
    return '?';
  }
}
