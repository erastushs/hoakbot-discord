import type { AssetManifest } from './schema.js';

const ownership = Object.freeze({
  copyright: 'HoakBot',
  license: 'Project-owned proprietary',
  attribution: 'Created for and owned by the HoakBot project; proprietary classification confirmed by the project owner on 2026-07-13.',
});

export const assetManifest = Object.freeze([
  { id: 'welcome:default-background', owner: 'welcome', type: 'texture', source: 'assets/images/default-welcome-bg.png', sha256: '91f824e1c4c02f1873626c9353544e4702bf9a3281e3688ec834ef54cdd4e6c1', mime: 'image/png', bytes: 6208, width: 800, height: 450, maxBytes: 2_000_000, maxWidth: 4096, maxHeight: 4096, consumer: ['src/shared/builders/member-card.builder.ts'], ownership },
  { id: 'voice:hoak', owner: 'voice', type: 'sound', source: 'assets/sounds/hoak.mp3', sha256: '6dc3dfbe1cd8fdd5592cd54d3c507a433698796d917d4a79a49eb77793bb3723', mime: 'audio/mpeg', bytes: 160479, durationMs: 5956, maxDurationMs: 30_000, maxBytes: 5_000_000, consumer: ['src/modules/voice/voice.plugin.ts', 'src/modules/voice/voice.module.ts'], ownership },
  { id: 'shrine:noise', owner: 'shrine', type: 'texture', source: 'src/modules/shrine/assets/textures/noise.png', sha256: 'b8ecbcb54e5bea4dd57eeb4e386a26c68c10dd08d67239fe940dd086336099e5', mime: 'image/png', bytes: 829922, width: 512, height: 512, maxBytes: 2_000_000, maxWidth: 4096, maxHeight: 4096, consumer: ['src/modules/shrine/canvas/TextureRenderer.ts'], ownership },
  { id: 'shrine:purple-fog', owner: 'shrine', type: 'texture', source: 'src/modules/shrine/assets/textures/purple-fog.png', sha256: '7df0cf91f4eaa95e6c5e4e0299e0551979b87a1b01daa8e8145601b1587a539d', mime: 'image/png', bytes: 166751, width: 1000, height: 1000, maxBytes: 2_000_000, maxWidth: 4096, maxHeight: 4096, consumer: ['src/modules/shrine/canvas/TextureRenderer.ts'], ownership },
  { id: 'shrine:scratches', owner: 'shrine', type: 'texture', source: 'src/modules/shrine/assets/textures/scratches.png', sha256: '99e2184d5b5eb415b619452478695cf2c0a0b42d69b7b99e5a24f633168d8031', mime: 'image/png', bytes: 33686, width: 1000, height: 1000, maxBytes: 2_000_000, maxWidth: 4096, maxHeight: 4096, consumer: ['src/modules/shrine/canvas/TextureRenderer.ts'], ownership },
  { id: 'shrine:vignette', owner: 'shrine', type: 'texture', source: 'src/modules/shrine/assets/textures/vignette.png', sha256: '0cb2c4ff5ccd92756a5f548d50e0dc903a92115d696bb6639cb8333bf16108ae', mime: 'image/png', bytes: 72104, width: 1000, height: 1000, maxBytes: 2_000_000, maxWidth: 4096, maxHeight: 4096, consumer: ['src/modules/shrine/canvas/TextureRenderer.ts'], ownership },
] satisfies AssetManifest);
