import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WarningService } from '../../src/modules/moderation/services/warning.service.js';
import type { WarningRow } from '../../src/modules/moderation/repositories/warning.repository.js';

function fakeWarning(overrides?: Partial<WarningRow>): WarningRow {
  return {
    id: 'warn-1',
    guild_id: 'guild-1',
    user_id: 'user-1',
    moderator_id: 'mod-1',
    reason: 'spamming',
    created_at: new Date('2025-01-01'),
    ...overrides,
  };
}

describe('WarningService', () => {
  let repository: {
    createWarning: ReturnType<typeof vi.fn>;
    getWarnings: ReturnType<typeof vi.fn>;
    countWarnings: ReturnType<typeof vi.fn>;
    deleteWarning: ReturnType<typeof vi.fn>;
    clearWarnings: ReturnType<typeof vi.fn>;
  };
  let logger: { info: ReturnType<typeof vi.fn>; warn: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
  let eventBus: { emit: ReturnType<typeof vi.fn> };
  let metrics: { counter: ReturnType<typeof vi.fn>; incrementFn: ReturnType<typeof vi.fn> };
  let service: WarningService;

  beforeEach(() => {
    const incrementFn = vi.fn();
    repository = {
      createWarning: vi.fn(),
      getWarnings: vi.fn(),
      countWarnings: vi.fn(),
      deleteWarning: vi.fn(),
      clearWarnings: vi.fn(),
    };
    logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    eventBus = { emit: vi.fn() };
    metrics = { counter: vi.fn(() => ({ increment: incrementFn })), incrementFn };
    service = new WarningService(
      repository as never,
      logger as never,
      eventBus as never,
      metrics as never,
    );
  });

  describe('warn', () => {
    const warnInput = {
      guildId: 'guild-1',
      userId: 'user-1',
      moderatorId: 'mod-1',
      reason: 'spamming',
    };

    beforeEach(() => {
      repository.createWarning.mockResolvedValue(fakeWarning());
      repository.countWarnings.mockResolvedValue(3);
    });

    it('calls repository.createWarning with correct input', async () => {
      await service.warn(warnInput);

      expect(repository.createWarning).toHaveBeenCalledWith({
        guildId: 'guild-1',
        userId: 'user-1',
        moderatorId: 'mod-1',
        reason: 'spamming',
      });
    });

    it('returns the created warning', async () => {
      const warning = fakeWarning({ id: 'warn-abc' });
      repository.createWarning.mockResolvedValue(warning);

      const result = await service.warn(warnInput);

      expect(result).toBe(warning);
    });

    it('emits moderation.warningIssued event', async () => {
      const warning = fakeWarning({ id: 'warn-xyz' });
      repository.createWarning.mockResolvedValue(warning);

      await service.warn(warnInput);

      expect(eventBus.emit).toHaveBeenCalledWith('moderation.warningIssued', {
        guildId: 'guild-1',
        moderatorId: 'mod-1',
        targetId: 'user-1',
        warningId: 'warn-xyz',
      });
    });

    it('increments warnings_issued_total counter', async () => {
      await service.warn(warnInput);

      expect(metrics.counter).toHaveBeenCalledWith('warnings_issued_total');
      expect(metrics.incrementFn).toHaveBeenCalledOnce();
    });

    it('logs warning issuance', async () => {
      const warning = fakeWarning({ id: 'warn-log-1' });
      repository.createWarning.mockResolvedValue(warning);

      await service.warn(warnInput);

      expect(logger.info).toHaveBeenCalledWith(
        {
          guildId: 'guild-1',
          userId: 'user-1',
          moderatorId: 'mod-1',
          warningId: 'warn-log-1',
          count: 3,
        },
        'Warning issued',
      );
    });

    it('throws when createWarning fails', async () => {
      repository.createWarning.mockRejectedValue(new Error('DB error'));

      await expect(service.warn(warnInput)).rejects.toThrow('DB error');
    });

    it('throws when countWarnings fails after creation', async () => {
      repository.countWarnings.mockRejectedValue(new Error('count error'));

      await expect(service.warn(warnInput)).rejects.toThrow('count error');
    });
  });

  describe('history', () => {
    it('delegates to repository.getWarnings', async () => {
      const rows = [fakeWarning(), fakeWarning({ id: 'warn-2' })];
      repository.getWarnings.mockResolvedValue(rows);

      const result = await service.history('guild-1', 'user-1', 10);

      expect(repository.getWarnings).toHaveBeenCalledWith('guild-1', 'user-1', 10);
      expect(result).toBe(rows);
    });

    it('uses default limit of 50', async () => {
      await service.history('guild-1', 'user-1');

      expect(repository.getWarnings).toHaveBeenCalledWith('guild-1', 'user-1', 50);
    });

    it('returns empty array when no warnings exist', async () => {
      repository.getWarnings.mockResolvedValue([]);

      const result = await service.history('guild-1', 'user-1');

      expect(result).toEqual([]);
    });

    it('throws when repository.getWarnings fails', async () => {
      repository.getWarnings.mockRejectedValue(new Error('query failed'));

      await expect(service.history('guild-1', 'user-1')).rejects.toThrow('query failed');
    });
  });

  describe('count', () => {
    it('delegates to repository.countWarnings', async () => {
      repository.countWarnings.mockResolvedValue(5);

      const result = await service.count('guild-1', 'user-1');

      expect(repository.countWarnings).toHaveBeenCalledWith('guild-1', 'user-1');
      expect(result).toBe(5);
    });

    it('throws when repository.countWarnings fails', async () => {
      repository.countWarnings.mockRejectedValue(new Error('count failed'));

      await expect(service.count('guild-1', 'user-1')).rejects.toThrow('count failed');
    });
  });

  describe('remove', () => {
    it('returns true and logs when deletion succeeds', async () => {
      repository.deleteWarning.mockResolvedValue(true);

      const result = await service.remove('warn-1');

      expect(repository.deleteWarning).toHaveBeenCalledWith('warn-1');
      expect(result).toBe(true);
      expect(logger.info).toHaveBeenCalledWith({ warningId: 'warn-1' }, 'Warning removed');
    });

    it('returns false when deletion fails (not found)', async () => {
      repository.deleteWarning.mockResolvedValue(false);

      const result = await service.remove('warn-2');

      expect(result).toBe(false);
      expect(logger.info).not.toHaveBeenCalled();
    });

    it('throws when repository.deleteWarning fails', async () => {
      repository.deleteWarning.mockRejectedValue(new Error('delete failed'));

      await expect(service.remove('warn-1')).rejects.toThrow('delete failed');
    });
  });

  describe('clear', () => {
    it('returns deleted count and logs when warnings cleared', async () => {
      repository.clearWarnings.mockResolvedValue(5);

      const result = await service.clear('guild-1', 'user-1');

      expect(repository.clearWarnings).toHaveBeenCalledWith('guild-1', 'user-1');
      expect(result).toBe(5);
      expect(logger.info).toHaveBeenCalledWith(
        { guildId: 'guild-1', userId: 'user-1', count: 5 },
        'Warnings cleared',
      );
    });

    it('returns 0 and does not log zero clears', async () => {
      repository.clearWarnings.mockResolvedValue(0);

      const result = await service.clear('guild-1', 'user-1');

      expect(result).toBe(0);
      expect(logger.info).not.toHaveBeenCalled();
    });

    it('throws when repository.clearWarnings fails', async () => {
      repository.clearWarnings.mockRejectedValue(new Error('clear failed'));

      await expect(service.clear('guild-1', 'user-1')).rejects.toThrow('clear failed');
    });
  });
});
