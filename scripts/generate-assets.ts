import { copyFile, lstat, mkdir, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assetManifest } from '../src/plugin-core/assets/manifest.js';
import { assetManifestSchema } from '../src/plugin-core/assets/schema.js';

export interface GenerateAssetsOptions {
  readonly root: string;
  readonly outputRoot: string;
}

export async function generateAssets({ root, outputRoot }: GenerateAssetsOptions): Promise<void> {
  const parsed = assetManifestSchema.parse(assetManifest);
  const generated = parsed.map((asset) => ({ ...asset, source: `${asset.id.replace(':', '/')}/${asset.source.split('/').at(-1)}` }));
  const staging = `${outputRoot}.staging`;
  await rm(staging, { recursive: true, force: true });
  await mkdir(staging, { recursive: true });
  try {
    for (const [index, asset] of parsed.entries()) {
      const source = resolve(root, asset.source);
      const relation = relative(root, source);
      if (relation === '..' || relation.startsWith(`..${sep}`)) throw new Error(`Asset escapes package root: ${asset.id}`);
      const info = await lstat(source);
      if (info.isSymbolicLink() || !info.isFile()) throw new Error(`Asset is not a regular file: ${asset.id}`);
      const canonical = await realpath(source);
      if (relative(root, canonical).startsWith('..')) throw new Error(`Asset symlink escapes package root: ${asset.id}`);
      const bytes = await readFile(source);
      if (bytes.byteLength !== asset.bytes || createHash('sha256').update(bytes).digest('hex') !== asset.sha256) throw new Error(`Asset integrity mismatch: ${asset.id}`);
      const destination = resolve(staging, generated[index]!.source);
      await mkdir(dirname(destination), { recursive: true });
      await copyFile(source, destination);
    }
    await writeFile(resolve(staging, 'asset-map.json'), `${JSON.stringify(generated, null, 2)}\n`);
    await rm(outputRoot, { recursive: true, force: true });
    await import('node:fs/promises').then(({ rename }) => rename(staging, outputRoot));
  } catch (error) {
    await rm(staging, { recursive: true, force: true });
    throw error;
  }
}

const scriptPath = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === scriptPath) {
  const root = resolve(dirname(scriptPath), '..');
  await generateAssets({ root, outputRoot: resolve(root, 'dist/assets') });
}
