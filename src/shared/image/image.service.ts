import { createCanvas, loadImage, type Canvas, type Image } from '@napi-rs/canvas';
import type { ILogger } from '../../core/logger/logger.service.js';

export class ImageService {
  private readonly assetCache = new Map<string, Image>();

  constructor(private readonly logger: ILogger) {}

  async loadAsset(url: string): Promise<Image> {
    const cached = this.assetCache.get(url);
    if (cached) return cached;

    const image = await loadImage(url);
    this.assetCache.set(url, image);
    this.logger.debug({ url }, 'Image asset cached');
    return image;
  }

  createCanvas(width: number, height: number): Canvas {
    return createCanvas(width, height);
  }

  drawRoundedImage(
    ctx: ReturnType<Canvas['getContext']>,
    image: Image,
    x: number,
    y: number,
    size: number,
    _radius: number,
  ): void {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(image, x, y, size, size);
    ctx.restore();
  }

  drawText(
    ctx: ReturnType<Canvas['getContext']>,
    text: string,
    font: string,
    x: number,
    y: number,
    maxWidth: number,
    align: 'center' | 'left' | 'right' = 'center',
    fillStyle: string = '#ffffff',
  ): void {
    ctx.save();
    ctx.font = font;
    ctx.textAlign = align;
    ctx.fillStyle = fillStyle;
    ctx.fillText(text, x, y, maxWidth);
    ctx.restore();
  }

  clearCache(): void {
    this.assetCache.clear();
  }

  getCacheSize(): number {
    return this.assetCache.size;
  }
}
