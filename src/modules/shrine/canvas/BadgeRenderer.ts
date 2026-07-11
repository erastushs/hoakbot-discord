import { canvasFont } from '../../../shared/canvas/fonts.js';
import type { ShrineUsageTier } from '../types.js';
import type { Context2D } from './canvas-types.js';
import { fillRoundedRect, strokeRoundedRect } from './canvas-shapes.js';

export interface BadgeStyle {
  label: string;
  color: string;
  shadow: string;
}

export const usageBadgeStyles: Record<ShrineUsageTier, BadgeStyle> = {
  veryhigh: { label: '🔥 VERY HIGH', color: '#D83B35', shadow: 'rgba(216, 59, 53, 0.36)' },
  high: { label: '🟠 HIGH', color: '#E9822D', shadow: 'rgba(233, 130, 45, 0.34)' },
  medium: { label: '🟡 MEDIUM', color: '#E3BD3B', shadow: 'rgba(227, 189, 59, 0.28)' },
  low: { label: '⚪ LOW', color: '#85888E', shadow: 'rgba(133, 136, 142, 0.24)' },
  unknown: { label: '⚪ LOW', color: '#85888E', shadow: 'rgba(133, 136, 142, 0.24)' },
};

export class BadgeRenderer {
  render(ctx: Context2D, tier: ShrineUsageTier, centerX: number, y: number): void {
    const style = usageBadgeStyles[tier];
    const width = tier === 'veryhigh' ? 184 : tier === 'medium' ? 156 : 130;
    const height = 38;
    const x = centerX - width / 2;

    ctx.save();
    ctx.shadowColor = style.shadow;
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 4;
    fillRoundedRect(ctx, x, y, width, height, 19, style.color);
    ctx.restore();

    strokeRoundedRect(ctx, x, y, width, height, 19, 'rgba(255, 255, 255, 0.22)');

    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = canvasFont(17, 700);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(style.label, centerX, y + height / 2 + 1, width - 18);
    ctx.restore();
  }
}
