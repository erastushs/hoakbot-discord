import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WelcomeImageBuilder } from '../../src/modules/welcome/builders/welcome-image.builder.js';
import type { WelcomeImageInput } from '../../src/modules/welcome/builders/welcome-image.builder.js';

const FONT_FAMILY = '"Noto Sans", "Noto Sans CJK JP", "Noto Color Emoji", sans-serif';

const mockContext = {
  save: vi.fn(),
  restore: vi.fn(),
  fillStyle: '',
  fillRect: vi.fn(),
  font: '',
  textAlign: 'left' as CanvasTextAlign,
  textBaseline: 'alphabetic' as CanvasTextBaseline,
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
  createLinearGradient: vi.fn(() => ({
    addColorStop: vi.fn(),
  })),
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

function makeImageService(loadAssetImpl?: (url: string) => Promise<unknown>) {
  const loadAsset = loadAssetImpl ?? vi.fn().mockResolvedValue(mockImage);
  return {
    loadAsset,
    createCanvas: vi.fn(() => mockCanvas),
    drawRoundedImage: vi.fn(),
    drawText: vi.fn(),
    warn: vi.fn(),
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

function fontString(size: number, weight: 'bold' | 'normal' = 'bold'): string {
  return `${weight} ${size}px ${FONT_FAMILY}`;
}

describe('WelcomeImageBuilder', () => {
  let imageService: ReturnType<typeof makeImageService>;
  let builder: WelcomeImageBuilder;

  beforeEach(() => {
    imageService = makeImageService();
    builder = new WelcomeImageBuilder(imageService as never);
    vi.clearAllMocks();
  });

  afterEach(() => {
    mockContext.measureText.mockImplementation(() => ({ width: 100 }));
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

  it('draws background image at full size', async () => {
    await builder.build(makeInput());

    expect(mockContext.drawImage).toHaveBeenCalledWith(mockImage, 0, 0, 800, 450);
  });

  it('does NOT draw a dark overlay (full colors shown)', async () => {
    await builder.build(makeInput());

    expect(mockContext.fillRect).not.toHaveBeenCalled();
  });

  it('draws white border around avatar (6px)', async () => {
    await builder.build(makeInput());

    expect(mockContext.stroke).toHaveBeenCalled();
    expect(mockContext.strokeStyle).toBe('#ffffff');
    expect(mockContext.lineWidth).toBe(6);
  });

  it('draws avatar at increased size (144px)', async () => {
    await builder.build(makeInput());

    expect(mockContext.clip).toHaveBeenCalled();
    expect(mockContext.drawImage).toHaveBeenCalledWith(
      mockImage,
      expect.any(Number),
      expect.any(Number),
      144,
      144,
    );
  });

  it('draws title at 52px bold white with strong shadow (Noto Sans)', async () => {
    await builder.build(makeInput());

    const titleCall = imageService.drawText.mock.calls.find(
      (c: unknown[]) => c[1] === 'WELCOME',
    );
    expect(titleCall).toBeDefined();
    expect(titleCall[2]).toBe(fontString(52));
    expect(titleCall[7]).toBe('#ffffff');
    expect(titleCall[8]).toEqual({ color: 'rgba(0, 0, 0, 0.7)', offsetX: 0, offsetY: 3, blur: 8 });
  });

  it('draws username at 36px bold gold with strong shadow (Noto Sans)', async () => {
    await builder.build(makeInput());

    const userCall = imageService.drawText.mock.calls.find(
      (c: unknown[]) => c[1] === 'TestUser',
    );
    expect(userCall).toBeDefined();
    expect(userCall[2]).toBe(fontString(36));
    expect(userCall[7]).toBe('#FFC107');
  });

  it('draws subtitle at 22px bold white, uppercased (Noto Sans)', async () => {
    await builder.build(makeInput());

    const subCall = imageService.drawText.mock.calls.find(
      (c: unknown[]) => c[1] === 'TO TEST GUILD',
    );
    expect(subCall).toBeDefined();
    expect(subCall[2]).toBe(fontString(22));
    expect(subCall[7]).toBe('#ffffff');
  });

  it('applies strong text shadow to all text elements', async () => {
    await builder.build(makeInput());

    for (const call of imageService.drawText.mock.calls) {
      expect(call[8]).toEqual({
        color: 'rgba(0, 0, 0, 0.7)',
        offsetX: 0,
        offsetY: 3,
        blur: 8,
      });
    }
  });

  it('passes through placeholder-like text unchanged', async () => {
    await builder.build(makeInput({ title: 'Hello {server}', subtitle: 'Member #{count}' }));

    const calls = imageService.drawText.mock.calls;
    const texts = calls.map((c: unknown[]) => c[1]);
    expect(texts).toContain('Hello {server}');
    expect(texts).toContain('MEMBER #{COUNT}');
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

  describe('Unicode support', () => {
    it('renders Japanese username', async () => {
      await builder.build(makeInput({ username: '太郎' }));

      const userCall = imageService.drawText.mock.calls.find(
        (c: unknown[]) => c[1] === '太郎',
      );
      expect(userCall).toBeDefined();
      expect(userCall[2]).toBe(fontString(36));
    });

    it('renders Chinese username', async () => {
      await builder.build(makeInput({ username: '小明' }));

      const userCall = imageService.drawText.mock.calls.find(
        (c: unknown[]) => c[1] === '小明',
      );
      expect(userCall).toBeDefined();
      expect(userCall[2]).toBe(fontString(36));
    });

    it('renders Korean username', async () => {
      await builder.build(makeInput({ username: '홍길동' }));

      const userCall = imageService.drawText.mock.calls.find(
        (c: unknown[]) => c[1] === '홍길동',
      );
      expect(userCall).toBeDefined();
      expect(userCall[2]).toBe(fontString(36));
    });

    it('renders emoji username', async () => {
      await builder.build(makeInput({ username: '🎉🌟🎊' }));

      const userCall = imageService.drawText.mock.calls.find(
        (c: unknown[]) => c[1] === '🎉🌟🎊',
      );
      expect(userCall).toBeDefined();
      expect(userCall[2]).toBe(fontString(36));
    });

    it('renders Indonesian username', async () => {
      await builder.build(makeInput({ username: 'Saya suka bot ini!' }));

      const userCall = imageService.drawText.mock.calls.find(
        (c: unknown[]) => c[1] === 'Saya suka bot ini!',
      );
      expect(userCall).toBeDefined();
      expect(userCall[2]).toBe(fontString(36));
    });

    it('renders mixed Latin and CJK username', async () => {
      await builder.build(makeInput({ username: 'John ジョン 约翰' }));

      const userCall = imageService.drawText.mock.calls.find(
        (c: unknown[]) => c[1] === 'John ジョン 约翰',
      );
      expect(userCall).toBeDefined();
      expect(userCall[2]).toBe(fontString(36));
    });
  });

  describe('Auto-scaling long usernames', () => {
    it('auto-scales a long username that exceeds max width', async () => {
      mockContext.measureText.mockImplementation(() => ({ width: 800 }));

      await builder.build(makeInput({ username: 'A'.repeat(100) }));

      const userCall = imageService.drawText.mock.calls.find(
        (c: unknown[]) => (c[1] as string).length === 100,
      );
      expect(userCall).toBeDefined();
      expect(userCall[2]).toBe(fontString(14));
    });

    it('keeps normal usernames at full 36px', async () => {
      await builder.build(makeInput({ username: 'ShortName' }));

      const userCall = imageService.drawText.mock.calls.find(
        (c: unknown[]) => c[1] === 'ShortName',
      );
      expect(userCall).toBeDefined();
      expect(userCall[2]).toBe(fontString(36));
    });
  });

  describe('Fallback behavior', () => {
    it('draws bundled default image when background fails to load', async () => {
      imageService = makeImageService(
        vi.fn()
          .mockRejectedValueOnce(new Error('bg fail'))
          .mockResolvedValueOnce(mockImage)
          .mockResolvedValueOnce(mockImage),
      );
      builder = new WelcomeImageBuilder(imageService as never);

      await builder.build(makeInput());

      expect(imageService.warn).toHaveBeenCalledWith(
        { url: 'https://example.com/bg.png' },
        'Failed to load background image, trying bundled default',
      );
      expect(mockContext.drawImage).toHaveBeenCalledWith(mockImage, 0, 0, 800, 450);
    });

    it('draws gradient fallback only when both background AND bundled default fail', async () => {
      imageService = makeImageService(
        vi.fn()
          .mockRejectedValueOnce(new Error('bg fail'))
          .mockRejectedValueOnce(new Error('default fail'))
          .mockResolvedValueOnce(mockImage),
      );
      builder = new WelcomeImageBuilder(imageService as never);

      await builder.build(makeInput());

      expect(imageService.warn).toHaveBeenCalledWith(
        { url: 'https://example.com/bg.png' },
        'Failed to load background image, trying bundled default',
      );
      expect(imageService.warn).toHaveBeenCalledWith(
        expect.objectContaining({ path: expect.any(String) }),
        'Bundled default background also failed, rendering solid color',
      );
      expect(mockContext.createLinearGradient).toHaveBeenCalled();
      expect(mockContext.fillRect).toHaveBeenCalled();
    });

    it('draws placeholder avatar when avatar fails to load', async () => {
      imageService = makeImageService(
        vi.fn()
          .mockResolvedValueOnce(mockImage)
          .mockRejectedValueOnce(new Error('avatar fail')),
      );
      builder = new WelcomeImageBuilder(imageService as never);

      await builder.build(makeInput({ username: 'TestUser' }));

      expect(mockContext.fillText).toHaveBeenCalledWith('T', expect.any(Number), expect.any(Number));
    });

    it('draws placeholder with "?" when avatar fails and username is empty', async () => {
      imageService = makeImageService(
        vi.fn()
          .mockResolvedValueOnce(mockImage)
          .mockRejectedValueOnce(new Error('avatar fail')),
      );
      builder = new WelcomeImageBuilder(imageService as never);

      await builder.build(makeInput({ username: '' }));

      expect(mockContext.fillText).toHaveBeenCalledWith('?', expect.any(Number), expect.any(Number));
    });

    it('still draws text even when background (with bundled) and avatar fail', async () => {
      imageService = makeImageService(
        vi.fn()
          .mockRejectedValueOnce(new Error('bg fail'))
          .mockRejectedValueOnce(new Error('default fail'))
          .mockRejectedValueOnce(new Error('avatar fail')),
      );
      builder = new WelcomeImageBuilder(imageService as never);

      await builder.build(makeInput({ username: 'Survivor' }));

      expect(mockContext.createLinearGradient).toHaveBeenCalled();
      expect(mockContext.fillText).toHaveBeenCalledWith('S', expect.any(Number), expect.any(Number));
    });
  });
});
