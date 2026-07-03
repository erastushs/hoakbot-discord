import { describe, expect, expectTypeOf, it, vi } from 'vitest';

import type { AuditEntry, AuditReader, AuditWriter } from '../../src/core/audit/types.js';

describe('audit interfaces', () => {
  it('defines audit entry, writer, and reader contracts without persistence', async () => {
    const entry = {
      id: 'audit-1',
      guildId: 'guild-1',
      module: 'voice',
      action: 'configuration.changed',
      actor: {
        id: 'user-1',
        type: 'user',
      },
      before: 1,
      after: 0.5,
      timestamp: Date.now(),
    } satisfies AuditEntry;

    const writer: AuditWriter = {
      write: vi.fn(async () => undefined),
    };
    const reader: AuditReader = {
      read: vi.fn(async () => [entry]),
    };

    await writer.write(entry);
    await expect(reader.read({ guildId: 'guild-1', module: 'voice' })).resolves.toEqual([entry]);
    expectTypeOf(entry).toMatchTypeOf<AuditEntry>();
  });
});
