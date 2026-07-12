import { resolve } from 'node:path';
import { AssetResolver, assetManifest } from '../../../plugin-core/assets/index.js';

const resolver = new AssetResolver(assetManifest);

export async function resolveVoiceSound(name: string): Promise<{ path: string; release(): void }> {
  if (process.env.HOAKBOT_ASSET_RESOLVER === '0') return { path: resolve('assets', 'sounds', `${name}.mp3`), release: () => undefined };
  const handle = await resolver.resolve('voice', `voice:${name}`);
  return { path: handle.path, release: handle.release };
}
