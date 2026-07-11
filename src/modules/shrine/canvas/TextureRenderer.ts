import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Image } from '@napi-rs/canvas';
import type { ImageService } from '../../../shared/image/image.service.js';
import type { Context2D } from './canvas-types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const textureRootCandidates = [
  resolve(process.cwd(), 'src/modules/shrine/assets/textures'),
  resolve(__dirname, '../assets/textures'),
  resolve(__dirname, '../../src/modules/shrine/assets/textures'),
];

export type ShrineTexture = 'noise' | 'purple-fog' | 'scratches' | 'vignette';

const textureFiles: Record<ShrineTexture, string> = {
  noise: 'noise.png',
  'purple-fog': 'purple-fog.png',
  scratches: 'scratches.png',
  vignette: 'vignette.png',
};

export class TextureRenderer {
  private readonly textureCache = new Map<ShrineTexture, Image>();

  constructor(private readonly imageService: ImageService) {}

  async load(texture: ShrineTexture): Promise<Image> {
    const cached = this.textureCache.get(texture);
    if (cached) return cached;

    let lastError: unknown;
    for (const root of textureRootCandidates) {
      try {
        const image = await this.imageService.loadAsset(resolve(root, textureFiles[texture]));
        this.textureCache.set(texture, image);
        return image;
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError instanceof Error ? lastError : new Error(`Failed to load Shrine texture: ${texture}`);
  }

  drawCover(ctx: Context2D, image: Image, opacity: number, width: number, height: number): void {
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.drawImage(image, 0, 0, width, height);
    ctx.restore();
  }

  drawTiled(ctx: Context2D, image: Image, opacity: number, width: number, height: number): void {
    ctx.save();
    ctx.globalAlpha = opacity;
    for (let x = 0; x < width; x += image.width) {
      for (let y = 0; y < height; y += image.height) {
        ctx.drawImage(image, x, y, image.width, image.height);
      }
    }
    ctx.restore();
  }
}
