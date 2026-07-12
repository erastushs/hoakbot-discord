import type { Image } from '@napi-rs/canvas';
import { canvasFont } from '../../../shared/canvas/fonts.js';
import type { ShrinePerk, ShrineUsageTier } from '../types.js';
import { usageBadgeStyles } from './BadgeRenderer.js';
import type { Context2D, Rect } from './canvas-types.js';
import { fillRoundedRect, roundedRectPath, strokeRoundedRect } from './canvas-shapes.js';

const PANEL_RADIUS = 20;
const ICON_SIZE = 202;
const ICON_TOP = 52;
const FOOTER_HEIGHT = 88;
const ACCENT_HEIGHT = 5;

export class PerkPanelRenderer {
  render(ctx: Context2D, perk: ShrinePerk, icon: Image | undefined, portrait: Image | undefined, shardIcon: Image | undefined, rect: Rect): void {
    const accent = usageBadgeStyles[perk.usageTier].color;

    this.drawPanel(ctx, rect, accent, portrait);
    this.drawIcon(ctx, icon, rect, accent);
    this.drawIdentity(ctx, perk, rect);
    this.drawStats(ctx, perk, shardIcon, rect, accent);
  }

  private drawPanel(ctx: Context2D, rect: Rect, accent: string, portrait: Image | undefined): void {
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.72)';
    ctx.shadowBlur = 32;
    ctx.shadowOffsetY = 14;
    fillRoundedRect(ctx, rect.x, rect.y, rect.width, rect.height, PANEL_RADIUS, '#101218');
    ctx.restore();

    ctx.save();
    roundedRectPath(ctx, rect.x, rect.y, rect.width, rect.height, PANEL_RADIUS);
    ctx.clip();
    if (portrait) this.drawCoverImage(ctx, portrait, rect);

    const veil = ctx.createLinearGradient(rect.x, rect.y + rect.height, rect.x, rect.y);
    veil.addColorStop(0, 'rgba(6, 8, 12, 0.96)');
    veil.addColorStop(0.42, 'rgba(7, 9, 14, 0.76)');
    veil.addColorStop(0.76, 'rgba(8, 10, 15, 0.48)');
    veil.addColorStop(1, 'rgba(8, 10, 15, 0.34)');
    ctx.fillStyle = veil;
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);

    const highlight = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + 38);
    highlight.addColorStop(0, 'rgba(255, 255, 255, 0.13)');
    highlight.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = highlight;
    ctx.fillRect(rect.x, rect.y, rect.width, 38);
    ctx.fillStyle = accent;
    ctx.fillRect(rect.x, rect.y, rect.width, ACCENT_HEIGHT);
    ctx.restore();

    ctx.save();
    ctx.shadowColor = accent;
    ctx.shadowBlur = 9;
    strokeRoundedRect(ctx, rect.x, rect.y, rect.width, rect.height, PANEL_RADIUS, accent, 2.5);
    ctx.restore();
    strokeRoundedRect(ctx, rect.x + 5, rect.y + 5, rect.width - 10, rect.height - 10, PANEL_RADIUS - 5, 'rgba(255, 255, 255, 0.11)');
  }

  private drawCoverImage(ctx: Context2D, image: Image, rect: Rect): void {
    const scale = Math.max(rect.width / image.width, rect.height / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.filter = 'blur(2px) saturate(0.82)';
    ctx.drawImage(image, rect.x + (rect.width - width) / 2, rect.y + (rect.height - height) / 2, width, height);
    ctx.restore();
  }

  private drawIcon(ctx: Context2D, icon: Image | undefined, rect: Rect, accent: string): void {
    if (!icon) return;
    const centerX = rect.x + rect.width / 2;
    const y = rect.y + ICON_TOP;
    const scale = Math.min(ICON_SIZE / icon.width, ICON_SIZE / icon.height);
    const width = icon.width * scale;
    const height = icon.height * scale;

    ctx.save();
    ctx.shadowColor = accent;
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 8;
    ctx.drawImage(icon, centerX - width / 2, y + (ICON_SIZE - height) / 2, width, height);
    ctx.restore();
  }

  private drawIdentity(ctx: Context2D, perk: ShrinePerk, rect: Rect): void {
    const centerX = rect.x + rect.width / 2;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 10;
    ctx.font = canvasFont(29, 700);
    ctx.fillText(perk.name, centerX, rect.y + 286, rect.width - 52);
    ctx.fillStyle = '#C4C8D0';
    ctx.font = canvasFont(19, 600);
    ctx.fillText(this.characterLabel(perk.character), centerX, rect.y + 322, rect.width - 62);
    ctx.restore();
  }

  private drawStats(ctx: Context2D, perk: ShrinePerk, shardIcon: Image | undefined, rect: Rect, accent: string): void {
    const y = rect.y + rect.height - FOOTER_HEIGHT;
    ctx.fillStyle = 'rgba(5, 7, 11, 0.9)';
    ctx.fillRect(rect.x + 14, y, rect.width - 28, FOOTER_HEIGHT - 12);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
    ctx.fillRect(rect.x + 32, y, rect.width - 64, 1);

    const usageX = rect.x + rect.width * 0.3;
    const costX = rect.x + rect.width * 0.7;
    this.drawStat(ctx, usageX, y, 'USAGE', this.usageLabel(perk.usageTier), accent);
    this.drawCost(ctx, costX, y, perk.shards, shardIcon);
  }

  private drawStat(ctx: Context2D, x: number, y: number, label: string, value: string, color: string): void {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#858B96';
    ctx.font = canvasFont(12, 700);
    ctx.fillText(label, x, y + 25);
    ctx.fillStyle = color;
    ctx.font = canvasFont(17, 700);
    ctx.fillText(value, x, y + 53, 150);
    ctx.restore();
  }

  private drawCost(ctx: Context2D, x: number, y: number, shards: number, shardIcon: Image | undefined): void {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#858B96';
    ctx.font = canvasFont(12, 700);
    ctx.fillText('COST', x, y + 25);
    const value = shards.toLocaleString();
    ctx.font = canvasFont(17, 700);
    const textWidth = ctx.measureText(value).width;
    const iconSize = 23;
    const gap = shardIcon ? 5 : 0;
    const totalWidth = textWidth + (shardIcon ? iconSize + gap : 0);
    const startX = x - totalWidth / 2;
    if (shardIcon) ctx.drawImage(shardIcon, startX, y + 36, iconSize, iconSize);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#F3F4F6';
    ctx.fillText(value, startX + (shardIcon ? iconSize + gap : 0), y + 54);
    ctx.restore();
  }

  private usageLabel(tier: ShrineUsageTier): string {
    return tier === 'veryhigh' ? 'VERY HIGH' : tier.toUpperCase();
  }

  private characterLabel(character: string): string {
    return character.replace(/^the\s+/i, '').toLowerCase().replace(/\b\p{L}/gu, (letter) => letter.toUpperCase());
  }
}
