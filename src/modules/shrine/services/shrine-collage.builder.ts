import type { ImageService } from '../../../shared/image/image.service.js';
import type { ShrinePerk } from '../types.js';

const CANVAS_SIZE = 512;
const ICON_SIZE = 224;
const GAP = 24;
const PADDING = (CANVAS_SIZE - ICON_SIZE * 2 - GAP) / 2;
const RADIUS = 24;

export class ShrineCollageBuilder {
  constructor(private readonly imageService: ImageService) {}

  async build(perks: ShrinePerk[], imageCdnUrl: string): Promise<Buffer> {
    const canvas = this.imageService.createCanvas(CANVAS_SIZE, CANVAS_SIZE);
    const ctx = canvas.getContext('2d');
    const icons = await Promise.all(perks.slice(0, 4).map((perk) => this.imageService.loadAsset(this.iconUrl(imageCdnUrl, perk.image))));

    icons.forEach((icon, index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      const x = PADDING + column * (ICON_SIZE + GAP);
      const y = PADDING + row * (ICON_SIZE + GAP);
      this.imageService.drawRoundedImage(ctx, icon, x, y, ICON_SIZE, RADIUS);
    });

    return canvas.encode('png');
  }

  private iconUrl(baseUrl: string, image: string): string {
    const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    return new URL(image, normalizedBase).toString();
  }
}
