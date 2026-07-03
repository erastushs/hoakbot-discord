import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WelcomeImageBuilder } from '../../src/modules/welcome/builders/welcome-image.builder.js';
import type { WelcomeImageInput } from '../../src/modules/welcome/builders/welcome-image.builder.js';

const mockContext = {
  save: vi.fn(),
  restore: vi.fn(),
  fillStyle: '',
  fillRect: vi.fn(),
  font: '',
  textAlign: 'left' as CanvasTextAlign,
  fillText: vi.fn(),
  drawImage: vi.fn(),
  beginPath: vi.fn(),
  arc: vi.fn(),
  closePath: vi.fn(),
  clip: vi.fn(),
  stroke: vi.fn(),
  shadowColor: '',
  shadowOffsetX: 0,
  shadowOffsetY: 0,
  shadowBlur: 0,
  strokeStyle: '',
  lineWidth: 1,
  measureText: vi.fn(() => ({ width: 100 })),
};

const mockCanvas = {
  width: 800,
  height: 450,
  getContext: vi.fn(() => mockContext),
  encodeSync: vi.fn(() => Buffer.from('fake-png')),
  encode: vi.fn(),
  toBuffer: vi.fn(),
  data: vi.fn(),
  toDataURL: vi.fn(),
  toDataURLAsync: vi.fn(),
  toBlob: vi.fn(),
  encodeStream: vi.fn(),
  convertToBlob: vi.fn(),
};

const mockImage = { width: 100, height: 100, src: '', naturalWidth: 100, naturalHeight: 100, complete: true, currentSrc: null, alt: '' };

function makeImageService() {
  const loadAsset = vi.fn().mockResolvedValue(mockImage);
  const createCanvas = vi.fn(() => mockCanvas);
  return {
    loadAsset,
    createCanvas,
    drawRoundedImage: vi.fn(),
    drawText: vi.fn(),
    clearCache: vi.fn(),
    getCacheSize: vi.fn(() => 0),
  };
}

function makeInput(overrides?: Partial<WelcomeImageInput>): WelcomeImageInput {
  return {
    username: 'TestUser',
    avatarUrl: 'https://example.com/avatar.png',
    backgroundUrl: 'https://example.com/bg.png',
    title: 'WELCOME',
    subtitle: 'TO TEST GUILD',
    ...overrides,
  };
}

describe('WelcomeImageBuilder', () => {
  let imageService: ReturnType<typeof makeImageService>;
  let builder: WelcomeImageBuilder;

  beforeEach(() => {
    imageService = makeImageService();
    builder = new WelcomeImageBuilder(imageService as never);
    vi.clearAllMocks();
  });

  it('creates a canvas with correct dimensions', async () => {
    await builder.build(makeInput());

    expect(imageService.createCanvas).toHaveBeenCalledWith(800, 450);
  });

  it('loads background asset', async () => {
    await builder.build(makeInput());

    expect(imageService.loadAsset).toHaveBeenCalledWith('https://example.com/bg.png');
  });

  it('loads avatar asset', async () => {
    await builder.build(makeInput());

    expect(imageService.loadAsset).toHaveBeenCalledWith('https://example.com/avatar.png');
  });

  it('draws background image', async () => {
    await builder.build(makeInput());

    expect(mockContext.drawImage).toHaveBeenCalled();
  });

  it('draws dark overlay for readability', async () => {
    await builder.build(makeInput());

    expect(mockContext.fillRect).toHaveBeenCalledWith(0, 0, 800, 450);
  });

  it('draws white border around avatar', async () => {
    await builder.build(makeInput());

    expect(mockContext.stroke).toHaveBeenCalled();
    expect(mockContext.strokeStyle).toBe('#ffffff');
  });

  it('draws avatar image clipped to circle', async () => {
    await builder.build(makeInput());

    expect(mockContext.clip).toHaveBeenCalled();
    expect(mockContext.drawImage).toHaveBeenCalledWith(
      mockImage,
      expect.any(Number),
      expect.any(Number),
      128,
      128,
    );
  });

  it('draws title with largest font and text shadow', async () => {
    await builder.build(makeInput());

    const titleCall = imageService.drawText.mock.calls.find(
      (c: unknown[]) => c[1] === 'WELCOME',
    );
    expect(titleCall).toBeDefined();
    expect(titleCall[2]).toContain('40px');
    expect(titleCall[7]).toEqual('#ffffff');
    expect(titleCall[8]).toEqual({ color: 'rgba(0, 0, 0, 0.5)', offsetX: 1, offsetY: 2, blur: 4 });
  });

  it('draws username with medium font', async () => {
    await builder.build(makeInput());

    const userCall = imageService.drawText.mock.calls.find(
      (c: unknown[]) => c[1] === 'TestUser',
    );
    expect(userCall).toBeDefined();
    expect(userCall[2]).toContain('30px');
  });

  it('draws subtitle with smallest font', async () => {
    await builder.build(makeInput());

    const subCall = imageService.drawText.mock.calls.find(
      (c: unknown[]) => c[1] === 'TO TEST GUILD',
    );
    expect(subCall).toBeDefined();
    expect(subCall[2]).toContain('22px');
  });

  it('text shadow is applied to all text elements', async () => {
    await builder.build(makeInput());

    for (const call of imageService.drawText.mock.calls) {
      expect(call[8]).toEqual({
        color: 'rgba(0, 0, 0, 0.5)',
        offsetX: 1,
        offsetY: 2,
        blur: 4,
      });
    }
  });

  it('passes through placeholder-like text unchanged', async () => {
    await builder.build(makeInput({ title: 'Hello {server}', subtitle: 'Member #{count}' }));

    const calls = imageService.drawText.mock.calls;
    const texts = calls.map((c: unknown[]) => c[1]);
    expect(texts).toContain('Hello {server}');
    expect(texts).toContain('Member #{count}');
  });

  it('returns a PNG buffer', async () => {
    const result = await builder.build(makeInput());

    expect(result).toBeInstanceOf(Buffer);
    expect(mockCanvas.encodeSync).toHaveBeenCalledWith('png');
  });

  it('loads both background and avatar via imageService', async () => {
    await builder.build(makeInput());

    expect(imageService.loadAsset).toHaveBeenCalledTimes(2);
  });
});
