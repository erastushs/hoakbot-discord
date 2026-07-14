import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const root = new URL('../../', import.meta.url);

async function read(path: string) {
  return readFile(new URL(path, root), 'utf8');
}

describe('H6 release gates', () => {
  it('validates every supported Node version with every required gate', async () => {
    const workflow = await read('.github/workflows/release.yml');
    expect(workflow).toMatch(/node-version:\s*\[22, 24, 26\]/);
    for (const command of [
      'npm run build',
      'npm run typecheck',
      'npm run lint',
      'npm run test:backend',
      'npm run dashboard:test',
      'npm run plugin-sdk:check',
      'npm run plugin-sdk:api:check',
      'npm run test:coverage',
      'npm run check-phase-09-parity',
      'npm run workspace:validate',
    ]) expect(workflow).toContain(`run: ${command}`);
  });

  it('publishes only after the complete validation matrix with minimal permissions', async () => {
    const workflow = await read('.github/workflows/release.yml');
    expect(workflow).toMatch(/permissions:\s*\n\s+contents: read/);
    expect(workflow).toMatch(/publish:\s*\n\s+needs: validate/);
    expect(workflow).toMatch(/publish:[\s\S]*?permissions:\s*\n\s+contents: write/);
    expect(workflow.indexOf('publish:')).toBeGreaterThan(workflow.indexOf('validate:'));
  });

  it('keeps workspace validation explicit and wired to the release gate', async () => {
    const packageJson = JSON.parse(await read('package.json')) as { scripts: Record<string, string> };
    const validator = await read('scripts/validate-workspaces.ts');
    expect(packageJson.scripts['workspace:validate']).toBe('tsx scripts/validate-workspaces.ts');
    expect(validator).toContain("['plugin-contracts', 'plugin-sdk', 'example-plugin']");
    expect(validator).toContain("['build', 'typecheck']");
  });
});
