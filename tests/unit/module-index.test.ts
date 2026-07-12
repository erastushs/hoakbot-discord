import { describe, expect, it } from 'vitest';

import { generatedModuleIndex, getGeneratedModuleIndex } from '../../src/modules/module-index.js';

describe('generated module index entry point', () => {
  it('projects the static built-in catalog for legacy consumers', () => {
    expect(generatedModuleIndex.map((entry) => entry.manifest.id)).toEqual([
      'general',
      'voice',
      'moderation',
      'logging',
      'welcome',
      'goodbye',
      'shrine',
    ]);
    expect(getGeneratedModuleIndex()).toBe(generatedModuleIndex);
    expect(generatedModuleIndex.every((entry) => entry.module === undefined)).toBe(true);
  });
});
