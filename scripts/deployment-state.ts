import { readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export interface DeploymentCatalogState {
  readonly hash: string;
  readonly scope: 'guild' | 'global';
  readonly deployedAt: string;
}

export async function readDeploymentCatalogState(path: string): Promise<DeploymentCatalogState | null> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as DeploymentCatalogState;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

export async function writeDeploymentCatalogState(path: string, state: DeploymentCatalogState): Promise<void> {
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  await rename(temporary, path);
}

export function defaultDeploymentStatePath(): string {
  return `${dirname(new URL(import.meta.url).pathname)}/../../../.command-deployment-state.json`;
}
