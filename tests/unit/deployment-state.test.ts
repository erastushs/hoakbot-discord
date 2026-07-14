import { chmod, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  defaultDeploymentStatePath,
  readDeploymentCatalogState,
  writeDeploymentCatalogState,
  type DeploymentCatalogState,
} from '../../scripts/deployment-state.js';

const state: DeploymentCatalogState = {
  hash: 'a'.repeat(64),
  scope: 'guild',
  deployedAt: '2026-07-14T00:00:00.000Z',
};

const previousDataDir = process.env['HOAKBOT_DATA_DIR'];

afterEach(() => {
  if (previousDataDir === undefined) delete process.env['HOAKBOT_DATA_DIR'];
  else process.env['HOAKBOT_DATA_DIR'] = previousDataDir;
});

describe('deployment-state persistence', () => {
  it('creates a missing runtime data directory', async () => {
    const root = await mkdtemp(join(tmpdir(), 'deployment-state-'));
    const path = join(root, 'missing', 'nested', 'state.json');

    await writeDeploymentCatalogState(path, state);

    await expect(readDeploymentCatalogState(path)).resolves.toEqual(state);
  });

  it('uses the writable runtime data directory when the repository root is read-only', async () => {
    const root = await mkdtemp(join(tmpdir(), 'deployment-state-'));
    const data = await mkdtemp(join(tmpdir(), 'deployment-data-'));
    process.env['HOAKBOT_DATA_DIR'] = data;
    await mkdir(root, { recursive: true });
    await chmod(root, 0o555);
    try {
      await writeDeploymentCatalogState(defaultDeploymentStatePath(), state);
      await expect(readDeploymentCatalogState(join(data, 'command-deployment-state.json'))).resolves.toEqual(state);
    } finally {
      await chmod(root, 0o755);
      await rm(root, { recursive: true, force: true });
      await rm(data, { recursive: true, force: true });
    }
  });

  it('migrates existing legacy state into the runtime data directory', async () => {
    const root = await mkdtemp(join(tmpdir(), 'deployment-state-'));
    const data = join(root, 'data');
    const legacy = join(root, '.command-deployment-state.json');
    const migrated: DeploymentCatalogState = { ...state, hash: 'b'.repeat(64) };
    process.env['HOAKBOT_DATA_DIR'] = data;
    await writeFile(legacy, `${JSON.stringify(migrated)}\n`, 'utf8');
    const cwd = process.cwd();
    process.chdir(root);
    try {
      await writeDeploymentCatalogState(defaultDeploymentStatePath(), state);
      await expect(readDeploymentCatalogState(join(data, 'command-deployment-state.json'))).resolves.toEqual(state);
      await expect(JSON.parse(await readFile(legacy, 'utf8'))).toEqual(migrated);
    } finally {
      process.chdir(cwd);
      await rm(root, { recursive: true, force: true });
    }
  });

  it('uses same-directory atomic temporary files without leftovers', async () => {
    const root = await mkdtemp(join(tmpdir(), 'deployment-state-'));
    const path = join(root, 'data', 'state.json');

    await writeDeploymentCatalogState(path, state);

    await expect(readDeploymentCatalogState(path)).resolves.toEqual(state);
    await expect(readdir(join(root, 'data'))).resolves.toEqual(['state.json']);
  });

  it('persists state across restart-style reads', async () => {
    const root = await mkdtemp(join(tmpdir(), 'deployment-state-'));
    const path = join(root, 'data', 'state.json');

    await writeDeploymentCatalogState(path, state);
    const first = await readDeploymentCatalogState(path);
    const second = await readDeploymentCatalogState(path);

    expect(first).toEqual(state);
    expect(second).toEqual(state);
  });
});
