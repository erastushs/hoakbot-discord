import { copyFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

export interface DeploymentCatalogState {
  readonly hash: string;
  readonly scope: 'guild' | 'global';
  readonly deployedAt: string;
}

const deploymentStateFile = 'command-deployment-state.json';
const legacyDeploymentStateFile = '.command-deployment-state.json';

export async function readDeploymentCatalogState(path: string): Promise<DeploymentCatalogState | null> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as DeploymentCatalogState;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

async function migrateLegacyDeploymentState(path: string): Promise<void> {
  if (path !== defaultDeploymentStatePath()) return;
  try {
    await readFile(path, 'utf8');
    return;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  try {
    await copyFile(legacyDeploymentStatePath(), path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
}

export async function writeDeploymentCatalogState(path: string, state: DeploymentCatalogState): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await migrateLegacyDeploymentState(path);
  const temporary = join(dirname(path), `.${deploymentStateFile}.${process.pid}.${randomUUID()}.tmp`);
  await writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  await rename(temporary, path);
}

export function defaultDeploymentStatePath(): string {
  return join(defaultDeploymentDataDirectory(), deploymentStateFile);
}

export function defaultDeploymentDataDirectory(): string {
  return resolve(process.env['HOAKBOT_DATA_DIR'] ?? 'data');
}

export function legacyDeploymentStatePath(): string {
  return resolve(legacyDeploymentStateFile);
}
