import { createHash } from 'node:crypto';
import { access, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { generateAssets } from '../../scripts/generate-assets.js';
import { assetManifest, assetManifestSchema, AssetResolver, readMp3DurationMs } from '../../src/plugin-core/assets/index.js';

const cloneManifest = () => assetManifest.map((asset) => ({ ...asset, consumer: [...asset.consumer], ownership: { ...asset.ownership } }));

describe('Phase 08 assets', () => {
  it('validates inventory provenance and rejects duplicate or invalid descriptors', () => {
    expect(assetManifestSchema.parse(assetManifest)).toHaveLength(6);
    expect(assetManifest.every((asset) => asset.ownership.attribution.includes('confirmed'))).toBe(true);
    expect(() => new AssetResolver([...assetManifest, assetManifest[0]!])).toThrow('Duplicate');
    expect(() => new AssetResolver([{ ...assetManifest[0]!, sha256: 'bad' }])).toThrow();
  });

  it('derives the declared MP3 duration', async () => {
    const bytes = await readFile(resolve('assets/sounds/hoak.mp3'));
    expect(readMp3DurationMs(bytes)).toBeGreaterThanOrEqual(5900);
    expect(readMp3DurationMs(bytes)).toBeLessThanOrEqual(6000);
  });

  it('uses bounded LRU semantics and protects live handles during disposal', async () => {
    const resolver = new AssetResolver(assetManifest, undefined, 1);
    const first = await resolver.resolve('shrine', 'shrine:noise');
    await expect(resolver.resolve('welcome', 'welcome:default-background')).rejects.toThrow('live handles');
    expect(() => resolver.dispose()).toThrow('live handles');
    first.release();
    const second = await resolver.resolve('welcome', 'welcome:default-background');
    second.release();
    resolver.dispose();
    await expect(resolver.resolve('welcome', 'welcome:default-background')).rejects.toThrow('disposed');
  });

  it('rejects cross-owner, missing, traversal, symlink, corrupt, oversized, MIME, dimensions, and duration failures', async () => {
    await expect(new AssetResolver(assetManifest).resolve('welcome', 'shrine:noise')).rejects.toThrow('not declared');
    await expect(new AssetResolver(assetManifest).resolve('shrine', 'shrine:missing')).rejects.toThrow('not declared');
    const directory = await mkdtemp(join(tmpdir(), 'hoakbot-assets-'));
    try {
      const original = assetManifest[0]!;
      for (const change of [{ source: '../escape.png' }, { bytes: original.maxBytes + 1 }, { sha256: '0'.repeat(64) }, { mime: 'image/jpeg' }, { width: original.width + 1 }]) {
        const manifest = cloneManifest();
        manifest[0] = { ...original, ...change };
        await expect(new AssetResolver(manifest).resolve('welcome', original.id)).rejects.toThrow();
      }
      const sound = assetManifest[1]!;
      const durationManifest = cloneManifest();
      durationManifest[1] = { ...sound, durationMs: sound.durationMs + 1000 };
      await expect(new AssetResolver(durationManifest).resolve('voice', sound.id)).rejects.toThrow('duration');
      await writeFile(join(directory, 'target.png'), Buffer.from('corrupt'));
      await symlink(join(directory, 'target.png'), join(directory, 'link.png'));
      await expect(new AssetResolver([{ ...original, source: 'link.png' }], directory).resolve('welcome', original.id)).rejects.toThrow('regular file');
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('generates deterministic clean deploy output without mutating source assets', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'hoakbot-build-'));
    const output = join(directory, 'assets');
    try {
      await generateAssets({ root: resolve('.'), outputRoot: output });
      await writeFile(join(output, 'stale'), 'stale');
      await generateAssets({ root: resolve('.'), outputRoot: output });
      await expect(access(join(output, 'stale'))).rejects.toThrow();
      const first = createHash('sha256').update(await readFile(join(output, 'asset-map.json'))).digest('hex');
      await generateAssets({ root: resolve('.'), outputRoot: output });
      const second = createHash('sha256').update(await readFile(join(output, 'asset-map.json'))).digest('hex');
      expect(second).toBe(first);
      expect(await readdir(output)).toEqual(['asset-map.json', 'shrine', 'voice', 'welcome']);
      const generated = JSON.parse(await readFile(join(output, 'asset-map.json'), 'utf8')) as Array<{ source: string }>;
      await access(join(output, generated[0]!.source));
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
