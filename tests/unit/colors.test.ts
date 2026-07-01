import { describe, it, expect } from 'vitest';
import { COLORS } from '../../src/shared/constants/colors.js';

describe('COLORS', () => {
  it('PRIMARY is 0x5865f2', () => {
    expect(COLORS.PRIMARY).toBe(0x5865f2);
  });

  it('SUCCESS is 0x22c55e', () => {
    expect(COLORS.SUCCESS).toBe(0x22c55e);
  });

  it('ERROR is 0xef4444', () => {
    expect(COLORS.ERROR).toBe(0xef4444);
  });

  it('WARNING is 0xfacc15', () => {
    expect(COLORS.WARNING).toBe(0xfacc15);
  });

  it('INFO is 0x3b82f6', () => {
    expect(COLORS.INFO).toBe(0x3b82f6);
  });

  describe('MODERATION', () => {
    it('CLEAN is 0x10b981', () => {
      expect(COLORS.MODERATION.CLEAN).toBe(0x10b981);
    });

    it('KICK is 0xf59e0b', () => {
      expect(COLORS.MODERATION.KICK).toBe(0xf59e0b);
    });

    it('BAN is 0xef4444', () => {
      expect(COLORS.MODERATION.BAN).toBe(0xef4444);
    });

    it('TIMEOUT is 0xa855f7', () => {
      expect(COLORS.MODERATION.TIMEOUT).toBe(0xa855f7);
    });

    it('WARN is 0xfacc15', () => {
      expect(COLORS.MODERATION.WARN).toBe(0xfacc15);
    });
  });
});
