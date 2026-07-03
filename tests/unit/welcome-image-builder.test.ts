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
    title: 'Welcome to Test Guild!',
    subtitle: 'You are member #42',
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

  it('draws overlay', async () => {
    await builder.build(makeInput());

    expect(mockContext.fillRect).toHaveBeenCalledWith(0, 0, 800, 450);
  });

  it('draws rounded avatar via imageService', async () => {
    await builder.build(makeInput());

    expect(imageService.drawRoundedImage).toHaveBeenCalled();
  });

  it('draws username text', async () => {
    await builder.build(makeInput());

    expect(imageService.drawText).toHaveBeenCalledWith(
      mockContext,
      'TestUser',
      expect.any(String),
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
      'center',
      '#ffffff',
    );
  });

  it('draws title text as-provided (no placeholder logic)', async () => {
    await builder.build(makeInput({ title: 'HELLO WORLD', subtitle: 'lorem ipsum' }));

    const calls = imageService.drawText.mock.calls;
    const texts = calls.map((c: unknown[]) => c[1]);
    expect(texts).toContain('HELLO WORLD');
    expect(texts).toContain('lorem ipsum');
  });

  it('passes through placeholder-like text unchanged', async () => {
    await builder.build(makeInput({ title: 'Hello {server}', subtitle: 'Member #{count}' }));

    const calls = imageService.drawText.mock.calls;
    const texts = calls.map((c: unknown[]) => c[1]);
    // Builder does NOT resolve {server} or {count} — text must pass through as-is
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
