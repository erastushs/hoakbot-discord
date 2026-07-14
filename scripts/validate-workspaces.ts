import { readFile } from 'node:fs/promises';

const workspaces = ['plugin-contracts', 'plugin-sdk', 'example-plugin'];
const requiredScripts = ['build', 'typecheck'];

for (const workspace of workspaces) {
  const path = new URL(`../packages/${workspace}/package.json`, import.meta.url);
  const manifest = JSON.parse(await readFile(path, 'utf8')) as {
    name?: string;
    engines?: { node?: string };
    scripts?: Record<string, string>;
  };

  if (!manifest.name?.startsWith('@hoakbot/')) throw new Error(`${workspace}: invalid package name`);
  if (manifest.engines?.node !== '>=22') throw new Error(`${workspace}: engines.node must be >=22`);
  for (const script of requiredScripts) {
    if (!manifest.scripts?.[script]) throw new Error(`${workspace}: missing ${script} script`);
  }
}

process.stdout.write(`Validated ${workspaces.length} workspaces\n`);
