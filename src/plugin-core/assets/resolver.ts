import { createHash } from 'node:crypto';
import { lstat, readFile, realpath } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assetManifestSchema, type AssetDescriptor, type AssetManifest } from './schema.js';

const moduleDirectory = dirname(fileURLToPath(import.meta.url));
export const defaultAssetRoot = resolve(moduleDirectory, '../../../');
export const deployedAssetRoot = resolve(moduleDirectory, '../../assets');

export interface AssetHandle {
  readonly descriptor: AssetDescriptor;
  readonly path: string;
  readonly buffer: Buffer;
  release(): void;
}

interface CacheEntry {
  readonly descriptor: AssetDescriptor;
  readonly path: string;
  readonly buffer: Buffer;
  references: number;
}

export class AssetResolver {
  private readonly descriptors: ReadonlyMap<string, AssetDescriptor>;
  private readonly cache = new Map<string, CacheEntry>();
  private disposed = false;

  constructor(manifest: AssetManifest, private readonly root = defaultAssetRoot, private readonly cacheLimit = 16) {
    if (!Number.isInteger(cacheLimit) || cacheLimit < 1) throw new Error('Asset cache limit must be positive');
    const parsed = assetManifestSchema.parse(manifest);
    const deployed = resolve(root) === resolve(defaultAssetRoot) && moduleDirectory.includes(`${sep}dist${sep}`);
    this.root = deployed ? deployedAssetRoot : root;
    this.descriptors = new Map(parsed.map((descriptor) => [descriptor.id, deployed ? { ...descriptor, source: `${descriptor.id.replace(':', '/')}/${descriptor.source.split('/').at(-1)}` } : descriptor]));
  }

  async resolve(owner: string, id: string): Promise<AssetHandle> {
    if (this.disposed) throw new Error('Asset resolver is disposed');
    const descriptor = this.descriptors.get(id);
    if (!descriptor || descriptor.owner !== owner || !id.startsWith(`${owner}:`)) throw new Error(`Asset is not declared for owner ${owner}: ${id}`);
    let entry = this.cache.get(id);
    if (entry) {
      this.cache.delete(id);
      this.cache.set(id, entry);
    } else {
      this.evict();
      const path = resolve(this.root, descriptor.source);
      this.assertContained(path);
      const info = await lstat(path);
      if (info.isSymbolicLink() || !info.isFile()) throw new Error(`Asset source must be a regular file: ${id}`);
      this.assertContained(await realpath(path));
      const buffer = await readFile(path);
      validateAsset(descriptor, buffer);
      entry = { descriptor, path, buffer, references: 0 };
      this.cache.set(id, entry);
    }
    entry.references += 1;
    let released = false;
    return Object.freeze({ descriptor: entry.descriptor, path: entry.path, buffer: entry.buffer, release: () => { if (released) return; released = true; entry!.references -= 1; } });
  }

  dispose(): void {
    if ([...this.cache.values()].some((entry) => entry.references > 0)) throw new Error('Cannot dispose asset resolver with live handles');
    this.cache.clear();
    this.disposed = true;
  }

  get cacheSize(): number {
    return this.cache.size;
  }

  private assertContained(path: string): void {
    const relation = relative(resolve(this.root), path);
    if (relation === '..' || relation.startsWith(`..${sep}`) || relation.startsWith(sep)) throw new Error('Asset path escapes package root');
  }

  private evict(): void {
    if (this.cache.size < this.cacheLimit) return;
    const candidate = [...this.cache].find(([, entry]) => entry.references === 0);
    if (!candidate) throw new Error('Asset cache is full with live handles');
    this.cache.delete(candidate[0]);
  }
}

export function validateAsset(descriptor: AssetDescriptor, buffer: Buffer): void {
  if (buffer.byteLength !== descriptor.bytes || buffer.byteLength > descriptor.maxBytes) throw new Error(`Asset size mismatch: ${descriptor.id}`);
  if (createHash('sha256').update(buffer).digest('hex') !== descriptor.sha256) throw new Error(`Asset hash mismatch: ${descriptor.id}`);
  if (descriptor.type === 'texture') {
    if (descriptor.mime !== 'image/png' || buffer.length < 24 || buffer.toString('ascii', 1, 4) !== 'PNG') throw new Error(`Asset MIME mismatch: ${descriptor.id}`);
    if (buffer.readUInt32BE(16) !== descriptor.width || buffer.readUInt32BE(20) !== descriptor.height || descriptor.width > descriptor.maxWidth || descriptor.height > descriptor.maxHeight) throw new Error(`Asset dimensions mismatch: ${descriptor.id}`);
  } else if (descriptor.type === 'sound') {
    if (descriptor.mime !== 'audio/mpeg') throw new Error(`Asset MIME mismatch: ${descriptor.id}`);
    const durationMs = readMp3DurationMs(buffer);
    if (Math.abs(durationMs - descriptor.durationMs) > 50 || durationMs > descriptor.maxDurationMs) throw new Error(`Asset duration mismatch: ${descriptor.id}`);
  } else {
    const signature = buffer.toString('ascii', 0, 4);
    const valid = descriptor.mime === 'font/ttf' ? buffer.readUInt32BE(0) === 0x00010000 || signature === 'true' : descriptor.mime === 'font/otf' ? signature === 'OTTO' : descriptor.mime === 'font/woff' ? signature === 'wOFF' : descriptor.mime === 'font/woff2' && signature === 'wOF2';
    if (!valid || !descriptor.family.trim() || descriptor.weight < 1 || descriptor.weight > 1000) throw new Error(`Asset font metadata mismatch: ${descriptor.id}`);
  }
}

export function readMp3DurationMs(buffer: Buffer): number {
  const tagEnd = buffer.subarray(0, 3).equals(Buffer.from('ID3')) && buffer.length >= 10 ? 10 + ((buffer[6]! & 0x7f) << 21) + ((buffer[7]! & 0x7f) << 14) + ((buffer[8]! & 0x7f) << 7) + (buffer[9]! & 0x7f) : 0;
  let offset = tagEnd < buffer.length ? tagEnd : 10;
  let samples = 0;
  while (offset + 4 <= buffer.length) {
    const header = buffer.readUInt32BE(offset);
    if ((header >>> 21) !== 0x7ff) { offset += 1; continue; }
    const version = (header >>> 19) & 3;
    const layer = (header >>> 17) & 3;
    const bitrateIndex = (header >>> 12) & 15;
    const sampleIndex = (header >>> 10) & 3;
    const rates = version === 3 ? [44100, 48000, 32000] : version === 2 ? [22050, 24000, 16000] : [11025, 12000, 8000];
    const bitrates = version === 3 ? [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320] : [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];
    const rate = rates[sampleIndex];
    const bitrate = bitrates[bitrateIndex];
    if (layer !== 1 || !rate || !bitrate) { offset += 1; continue; }
    const frameLength = Math.floor((version === 3 ? 144 : 72) * bitrate * 1000 / rate) + ((header >>> 9) & 1);
    if (frameLength < 4 || offset + frameLength > buffer.length) break;
    samples += version === 3 ? 1152 : 576;
    offset += frameLength;
  }
  if (samples === 0) throw new Error('Invalid MP3 stream');
  return Math.round(samples / 44_100 * 1000);
}
