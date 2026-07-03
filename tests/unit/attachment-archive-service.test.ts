import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AttachmentArchiveService } from '../../src/shared/attachment/attachment-archive.service.js';
import type { AttachmentBuilder } from 'discord.js';

describe('AttachmentArchiveService', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(4)),
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function makeAttachments(...entries: Array<[string, string, number]>) {
    const map = new Map<string, { url: string; name: string; size: number }>();
    for (const [id, name, size] of entries) {
      map.set(id, { url: `https://cdn.discord.com/${id}/${name}`, name, size });
    }
    return map;
  }

  it('archives one attachment successfully', async () => {
    const service = new AttachmentArchiveService();
    const attachments = makeAttachments(['a1', 'image.png', 5000]);

    const result = await service.archive(attachments, { maxSizeBytes: 10 * 1024 * 1024 });

    expect(result.files).toHaveLength(1);
    expect(result.files[0]?.name).toBe('image.png');
    expect(result.archivedCount).toBe(1);
    expect(result.failedCount).toBe(0);
    expect(result.skippedCount).toBe(0);
  });

  it('archives multiple attachments', async () => {
    const service = new AttachmentArchiveService();
    const attachments = makeAttachments(
      ['a1', 'a.png', 1000],
      ['a2', 'b.png', 1000],
      ['a3', 'c.png', 1000],
    );

    const result = await service.archive(attachments, { maxSizeBytes: 10 * 1024 * 1024 });

    expect(result.files).toHaveLength(3);
    expect(result.archivedCount).toBe(3);
  });

  it('skips files larger than maxSizeBytes', async () => {
    const service = new AttachmentArchiveService();
    const attachments = makeAttachments(['big', 'large.zip', 15 * 1024 * 1024]);

    const result = await service.archive(attachments, { maxSizeBytes: 10 * 1024 * 1024 });

    expect(result.files).toHaveLength(0);
    expect(result.skippedCount).toBe(1);
    expect(result.archivedCount).toBe(0);
  });

  it('handles failed downloads', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const service = new AttachmentArchiveService();
    const attachments = makeAttachments(['fail', 'broken.png', 1000]);

    const result = await service.archive(attachments, { maxSizeBytes: 10 * 1024 * 1024 });

    expect(result.files).toHaveLength(0);
    expect(result.failedCount).toBe(1);
    expect(result.archivedCount).toBe(0);
  });

  it('handles non-ok HTTP response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      arrayBuffer: vi.fn(),
    });

    const service = new AttachmentArchiveService();
    const attachments = makeAttachments(['bad', 'img.png', 1000]);

    const result = await service.archive(attachments, { maxSizeBytes: 10 * 1024 * 1024 });

    expect(result.files).toHaveLength(0);
    expect(result.failedCount).toBe(1);
  });

  it('mixed success/failure/skip', async () => {
    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) return Promise.resolve({ ok: true, arrayBuffer: async () => new ArrayBuffer(4) });
      if (callCount === 2) return Promise.reject(new Error('fail'));
      return Promise.resolve({ ok: true, arrayBuffer: async () => new ArrayBuffer(4) });
    });

    const service = new AttachmentArchiveService();
    const attachments = makeAttachments(
      ['a1', 'good.png', 1000],
      ['a2', 'bad.png', 1000],
      ['a3', 'also-good.png', 1000],
    );

    const result = await service.archive(attachments, { maxSizeBytes: 10 * 1024 * 1024 });

    expect(result.archivedCount).toBe(2);
    expect(result.failedCount).toBe(1);
    expect(result.skippedCount).toBe(0);
    expect(result.files).toHaveLength(2);
  });

  it('produces Buffer from arrayBuffer', async () => {
    const data = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: vi.fn().mockResolvedValue(data.buffer),
    });

    const service = new AttachmentArchiveService();
    const attachments = makeAttachments(['a1', 'test.png', 1000]);

    const result = await service.archive(attachments, { maxSizeBytes: 10 * 1024 * 1024 });

    expect(Buffer.isBuffer((result.files[0] as unknown as { attachment: Buffer }).attachment)).toBe(true);
  });

  it('maxSizeBytes static helper works correctly', () => {
    expect(AttachmentArchiveService.maxSizeBytes(1)).toBe(1024 * 1024);
    expect(AttachmentArchiveService.maxSizeBytes(10)).toBe(10 * 1024 * 1024);
    expect(AttachmentArchiveService.maxSizeBytes(0.5)).toBe(524288);
  });
});
