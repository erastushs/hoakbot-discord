import type { Image } from '@napi-rs/canvas';
import type { ImageService } from '../../../shared/image/image.service.js';
import type { ShrineRotation } from '../types.js';
import { BackgroundRenderer } from './BackgroundRenderer.js';
import type { Rect } from './canvas-types.js';
import { fillRoundedRect, strokeRoundedRect } from './canvas-shapes.js';
import { PerkPanelRenderer } from './PerkPanelRenderer.js';
import { TextureRenderer } from './TextureRenderer.js';

const WIDTH = 1000;
const HEIGHT = 1000;
const OUTER_MARGIN = 24;
const PANEL_RADIUS = 24;
const GRID_PADDING = 14;
const CELL_GAP = 12;

const portraitSlugOverrides: Readonly<Record<string, string>> = {};

export interface ShrineCardAssets {
  imageCdnUrl: string;
  portraitFolder: string;
  perkFolder: string;
  iridescentShardIcon: string;
}

export class ShrineCardRenderer {
  static readonly fileName = 'shrine-card.png';
  static readonly attachmentUrl = 'attachment://shrine-card.png';
  static readonly width = WIDTH;
  static readonly height = HEIGHT;

  private readonly backgroundRenderer: BackgroundRenderer;
  private readonly perkPanelRenderer = new PerkPanelRenderer();

  constructor(private readonly imageService: ImageService) {
    this.backgroundRenderer = new BackgroundRenderer(new TextureRenderer(imageService));
  }

  async render(rotation: ShrineRotation, config: ShrineCardAssets): Promise<Buffer> {
    const canvas = this.imageService.createCanvas(WIDTH, HEIGHT);
    const ctx = canvas.getContext('2d');
    const perks = rotation.perks.slice(0, 4);
    const [shardIcon, ...assets] = await Promise.all([
      this.loadAsset(this.assetUrl(config.imageCdnUrl, config.iridescentShardIcon), 'Iridescent Shard icon'),
      ...perks.map(async (perk) => ({
        icon: await this.loadAsset(this.perkUrl(config, perk.image), 'Shrine perk icon'),
        portrait: await this.loadAsset(this.portraitUrl(config, perk.character), 'Shrine character portrait'),
      })),
    ]);

    await this.backgroundRenderer.render(ctx, WIDTH, HEIGHT);
    this.drawMainPanel(ctx);

    const cells = this.gridCells();
    perks.forEach((perk, index) => {
      const cell = cells[index];
      const perkAssets = assets[index];
      if (cell) this.perkPanelRenderer.render(ctx, perk, perkAssets?.icon, perkAssets?.portrait, shardIcon as Image | undefined, cell);
    });

    return canvas.encode('png');
  }

  private drawMainPanel(ctx: ReturnType<ReturnType<ImageService['createCanvas']>['getContext']>): void {
    const x = OUTER_MARGIN;
    const y = OUTER_MARGIN;
    const width = WIDTH - OUTER_MARGIN * 2;
    const height = HEIGHT - OUTER_MARGIN * 2;

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.58)';
    ctx.shadowBlur = 34;
    ctx.shadowOffsetY = 16;
    fillRoundedRect(ctx, x, y, width, height, PANEL_RADIUS, 'rgba(11, 12, 15, 0.72)');
    ctx.restore();

    const panelGradient = ctx.createLinearGradient(x, y, x, y + height);
    panelGradient.addColorStop(0, 'rgba(255, 255, 255, 0.055)');
    panelGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.012)');
    panelGradient.addColorStop(1, 'rgba(0, 0, 0, 0.24)');
    fillRoundedRect(ctx, x, y, width, height, PANEL_RADIUS, panelGradient);
    strokeRoundedRect(ctx, x, y, width, height, PANEL_RADIUS, 'rgba(255, 255, 255, 0.15)', 1.2);
  }

  private gridCells(): Rect[] {
    const gridX = OUTER_MARGIN + GRID_PADDING;
    const gridY = OUTER_MARGIN + GRID_PADDING;
    const gridWidth = WIDTH - OUTER_MARGIN * 2 - GRID_PADDING * 2;
    const gridHeight = HEIGHT - OUTER_MARGIN * 2 - GRID_PADDING * 2;
    const cellWidth = (gridWidth - CELL_GAP) / 2;
    const cellHeight = (gridHeight - CELL_GAP) / 2;

    return [
      { x: gridX, y: gridY, width: cellWidth, height: cellHeight },
      { x: gridX + cellWidth + CELL_GAP, y: gridY, width: cellWidth, height: cellHeight },
      { x: gridX, y: gridY + cellHeight + CELL_GAP, width: cellWidth, height: cellHeight },
      { x: gridX + cellWidth + CELL_GAP, y: gridY + cellHeight + CELL_GAP, width: cellWidth, height: cellHeight },
    ];
  }

  private async loadAsset(url: string, asset: string): Promise<Image | undefined> {
    try {
      return await this.imageService.loadAsset(url);
    } catch {
      this.imageService.warn({ url }, `Failed to load ${asset}`);
      return undefined;
    }
  }

  private portraitUrl(config: ShrineCardAssets, character: string): string {
    return this.assetUrl(config.imageCdnUrl, config.portraitFolder, `${this.characterSlug(character)}.png`);
  }

  private perkUrl(config: ShrineCardAssets, image: string): string {
    const imagePath = this.removeFolderPrefix(image, config.perkFolder);
    return this.assetUrl(config.imageCdnUrl, config.perkFolder, imagePath);
  }

  private characterSlug(character: string): string {
    const normalizedName = character.trim().toLowerCase();
    return portraitSlugOverrides[normalizedName] ?? normalizedName
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private removeFolderPrefix(path: string, folder: string): string {
    const normalizedPath = path.replace(/^\/+/, '');
    const normalizedFolder = folder.replace(/^\/+|\/+$/g, '');
    return normalizedPath.startsWith(`${normalizedFolder}/`) ? normalizedPath.slice(normalizedFolder.length + 1) : normalizedPath;
  }

  private assetUrl(baseUrl: string, ...parts: string[]): string {
    const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    const path = parts.map((part) => part.replace(/^\/+|\/+$/g, '')).filter(Boolean).join('/');
    return new URL(path, normalizedBase).toString();
  }
}
