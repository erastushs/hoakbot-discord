import { resolve } from 'node:path';
import type { Image } from '@napi-rs/canvas';
import { AssetResolver, assetManifest } from '../../../plugin-core/assets/index.js';
import type { ImageService } from '../../../shared/image/image.service.js';
import type { Context2D } from './canvas-types.js';

const assetResolver = new AssetResolver(assetManifest);

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

    if (process.env.HOAKBOT_ASSET_RESOLVER !== '0') {
      const handle = await assetResolver.resolve('shrine', `shrine:${texture}`);
      try {
        const image = await this.imageService.loadAsset(handle.path);
        this.textureCache.set(texture, image);
        return image;
      } finally {
        handle.release();
      }
    }

    const image = await this.imageService.loadAsset(resolve(process.cwd(), 'src/modules/shrine/assets/textures', textureFiles[texture]));
    this.textureCache.set(texture, image);
    return image;
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
