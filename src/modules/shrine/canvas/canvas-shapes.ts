import type { Context2D, FillStyle } from './canvas-types.js';

export function roundedRectPath(ctx: Context2D, x: number, y: number, width: number, height: number, radius: number): void {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

export function fillRoundedRect(ctx: Context2D, x: number, y: number, width: number, height: number, radius: number, fillStyle: FillStyle): void {
  roundedRectPath(ctx, x, y, width, height, radius);
  ctx.fillStyle = fillStyle;
  ctx.fill();
}

export function strokeRoundedRect(ctx: Context2D, x: number, y: number, width: number, height: number, radius: number, strokeStyle: string, lineWidth = 1): void {
  roundedRectPath(ctx, x + lineWidth / 2, y + lineWidth / 2, width - lineWidth, height - lineWidth, radius);
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}
