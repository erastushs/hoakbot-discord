import type { Image } from '@napi-rs/canvas';
import { canvasFont } from '../../../shared/canvas/fonts.js';
import type { ShrinePerk } from '../types.js';
import { usageBadgeStyles, BadgeRenderer } from './BadgeRenderer.js';
import type { Context2D, Rect } from './canvas-types.js';
import { fillRoundedRect, roundedRectPath, strokeRoundedRect } from './canvas-shapes.js';

const PANEL_RADIUS = 18;
const ICON_SIZE = 236;
const ICON_TOP = 46;
const ACCENT_HEIGHT = 5;
const NAME_Y = 300;
const NAME_LINE_HEIGHT = 31;
const CHARACTER_GAP = 29;
const COST_GAP = 30;

export class PerkPanelRenderer {
  constructor(private readonly badgeRenderer = new BadgeRenderer()) {}

  render(ctx: Context2D, perk: ShrinePerk, icon: Image | undefined, rect: Rect): void {
    const accent = usageBadgeStyles[perk.usageTier].color;
    const centerX = rect.x + rect.width / 2;

    this.drawPanelChrome(ctx, rect, accent);
    this.drawIcon(ctx, icon, centerX, rect.y + ICON_TOP);
    this.drawText(ctx, perk, rect, centerX);
  }

  private drawPanelChrome(ctx: Context2D, rect: Rect, accent: string): void {
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.54)';
    ctx.shadowBlur = 28;
    ctx.shadowOffsetY = 12;
    fillRoundedRect(ctx, rect.x, rect.y, rect.width, rect.height, PANEL_RADIUS, '#15171B');
    ctx.restore();

    const inner = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.height);
    inner.addColorStop(0, 'rgba(255, 255, 255, 0.075)');
    inner.addColorStop(0.42, 'rgba(255, 255, 255, 0.018)');
    inner.addColorStop(1, 'rgba(0, 0, 0, 0.22)');
    fillRoundedRect(ctx, rect.x, rect.y, rect.width, rect.height, PANEL_RADIUS, inner);

    ctx.save();
    roundedRectPath(ctx, rect.x, rect.y, rect.width, rect.height, PANEL_RADIUS);
    ctx.clip();
    const accentGradient = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.width, rect.y);
    accentGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
    accentGradient.addColorStop(0.18, accent);
    accentGradient.addColorStop(0.82, accent);
    accentGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = accentGradient;
    ctx.globalAlpha = 0.92;
    ctx.fillRect(rect.x, rect.y, rect.width, ACCENT_HEIGHT);
    ctx.restore();

    strokeRoundedRect(ctx, rect.x, rect.y, rect.width, rect.height, PANEL_RADIUS, 'rgba(255, 255, 255, 0.12)');
  }

  private drawIcon(ctx: Context2D, icon: Image | undefined, centerX: number, top: number): void {
    const iconX = centerX - ICON_SIZE / 2;
    const iconY = top;

    ctx.save();
    const glow = ctx.createRadialGradient(centerX, iconY + ICON_SIZE / 2, 26, centerX, iconY + ICON_SIZE / 2, 148);
    glow.addColorStop(0, 'rgba(156, 91, 255, 0.34)');
    glow.addColorStop(0.48, 'rgba(91, 44, 165, 0.18)');
    glow.addColorStop(1, 'rgba(91, 44, 165, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(centerX - 160, iconY - 70, 320, 320);
    ctx.restore();

    if (!icon) return;

    const scale = Math.min(ICON_SIZE / icon.width, ICON_SIZE / icon.height);
    const drawWidth = icon.width * scale;
    const drawHeight = icon.height * scale;
    ctx.drawImage(icon, centerX - drawWidth / 2, iconY + (ICON_SIZE - drawHeight) / 2, drawWidth, drawHeight);
  }

  private drawText(ctx: Context2D, perk: ShrinePerk, rect: Rect, centerX: number): void {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';

    const nameLines = this.drawWrappedText(ctx, perk.name, centerX, rect.y + NAME_Y, rect.width - 66, NAME_LINE_HEIGHT, 2, canvasFont(30, 700), '#F7F3EC');
    const nameBottom = rect.y + NAME_Y + (nameLines - 1) * NAME_LINE_HEIGHT;

    ctx.fillStyle = '#A9AFB8';
    ctx.font = canvasFont(21, 600);
    const characterY = nameBottom + CHARACTER_GAP;
    ctx.fillText(perk.character, centerX, characterY, rect.width - 74);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = canvasFont(23, 700);
    ctx.fillText(`💎 ${perk.shards.toLocaleString()}`, centerX, characterY + COST_GAP, rect.width - 74);
    ctx.restore();

    this.badgeRenderer.render(ctx, perk.usageTier, centerX, rect.y + rect.height - 58);
  }

  private drawWrappedText(
    ctx: Context2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number,
    maxLines: number,
    font: string,
    color: string,
  ): number {
    ctx.save();
    ctx.font = font;
    ctx.fillStyle = color;

    const words = text.split(' ');
    const lines: string[] = [];
    let line = '';

    words.forEach((word) => {
      const testLine = line ? `${line} ${word}` : word;
      if (ctx.measureText(testLine).width > maxWidth && line) {
        lines.push(line);
        line = word;
        return;
      }
      line = testLine;
    });

    if (line) lines.push(line);
    const visibleLines = lines.slice(0, maxLines);
    visibleLines.forEach((lineText, index) => {
      ctx.fillText(lineText, x, y + index * lineHeight, maxWidth);
    });
    ctx.restore();
    return Math.max(visibleLines.length, 1);
  }
}
