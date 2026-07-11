import type { Context2D } from './canvas-types.js';
import { TextureRenderer } from './TextureRenderer.js';

export class BackgroundRenderer {
  constructor(private readonly textures: TextureRenderer) {}

  async render(ctx: Context2D, width: number, height: number): Promise<void> {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#0F1012');
    gradient.addColorStop(1, '#1B1D21');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    const [noise, fog, scratches, vignette] = await Promise.all([
      this.textures.load('noise'),
      this.textures.load('purple-fog'),
      this.textures.load('scratches'),
      this.textures.load('vignette'),
    ]);

    this.textures.drawTiled(ctx, noise, 0.05, width, height);
    this.textures.drawCover(ctx, fog, 0.15, width, height);
    this.textures.drawCover(ctx, scratches, 0.12, width, height);
    this.textures.drawCover(ctx, vignette, 0.55, width, height);
  }
}
