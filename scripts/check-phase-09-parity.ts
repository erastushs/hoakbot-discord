import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const report = JSON.parse(readFileSync(resolve(process.cwd(), 'tests/fixtures/parity-4.0.0.json'), 'utf8')) as { status: string; builtIns: Record<string, Record<string, string>>; upgrade: { result: string }; rollback: { result: string } };
const ids = ['general', 'logging', 'welcome', 'goodbye', 'voice', 'moderation', 'shrine'];
const boundaries = ['lifecycle', 'commands', 'events', 'config', 'api', 'dashboard', 'assets'];
if (report.status !== 'approved' || report.upgrade.result !== 'pass' || report.rollback.result !== 'pass') throw new Error('Phase 09 parity approval is incomplete.');
for (const id of ids) {
  const entry = report.builtIns[id];
  if (!entry) throw new Error(`Missing parity entry: ${id}`);
  for (const boundary of boundaries) if (!['parity', 'not-applicable'].includes(entry[boundary] ?? '')) throw new Error(`Missing parity result: ${id}.${boundary}`);
}
