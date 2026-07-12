import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface Metric { pct: number }
interface Summary { total: { statements: Metric; branches: Metric; functions: Metric; lines: Metric } }
interface Policy { root: Record<string, number>; dashboard: Record<string, number>; tolerance: number }

const root = resolve(process.cwd());
const policy = JSON.parse(readFileSync(resolve(root, 'tests/fixtures/phase-09-coverage-policy.json'), 'utf8')) as Policy;
const failures: string[] = [];
for (const layer of ['root', 'dashboard'] as const) {
  const summary = JSON.parse(readFileSync(resolve(root, `artifacts/coverage/${layer}/coverage-summary.json`), 'utf8')) as Summary;
  for (const metric of ['statements', 'branches', 'functions', 'lines'] as const) {
    const actual = summary.total[metric].pct;
    const baseline = policy[layer][metric]!;
    if (actual + policy.tolerance < baseline) failures.push(`${layer}.${metric}: ${actual} < ${baseline}`);
  }
}
if (failures.length) throw new Error(`Coverage regression:\n${failures.join('\n')}`);
