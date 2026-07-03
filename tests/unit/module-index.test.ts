import { describe, expect, it } from 'vitest';

import { generatedModuleIndex, getGeneratedModuleIndex } from '../../src/modules/module-index.js';

describe('generated module index entry point', () => {
  it('exports an empty generated index until build-time generation is added', () => {
    expect(generatedModuleIndex).toEqual([]);
    expect(getGeneratedModuleIndex()).toBe(generatedModuleIndex);
  });
});
