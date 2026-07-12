import { cp, lstat, mkdir, mkdtemp, open, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';

const validName = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/;
export interface CreateOptions { readonly id?: string; readonly description?: string; readonly license?: string }
async function assertSafeParent(target: string): Promise<void> { let current = dirname(target); while (current !== dirname(current)) { try { if ((await lstat(current)).isSymbolicLink()) throw new Error('UNSAFE_DESTINATION'); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; } current = dirname(current); } }
export async function createPlugin(name: string, destination: string, templateRoot: string, options: CreateOptions = {}): Promise<void> {
  if (!validName.test(name) || name.includes('..')) throw new Error('INVALID_PLUGIN_NAME');
  const id = options.id ?? name.replace(/^@/, '').replace('/', ':'); if (!/^[a-z0-9][a-z0-9:._/-]*$/.test(id)) throw new Error('INVALID_PLUGIN_ID');
  const target = resolve(destination); if (target === resolve(sep)) throw new Error('UNSAFE_DESTINATION'); await assertSafeParent(target);
  try { const handle = await open(target, 'wx'); await handle.close(); await rm(target); throw new Error('DESTINATION_RACE_GUARD'); } catch (error) { const code = (error as NodeJS.ErrnoException).code; if (code === 'EEXIST') throw new Error('DESTINATION_EXISTS'); if (code !== 'ENOENT' && (error as Error).message !== 'DESTINATION_RACE_GUARD') throw error; }
  await mkdir(dirname(target), { recursive: true }); const temporary = await mkdtemp(join(dirname(target), '.hoak-plugin-'));
  try {
    await cp(templateRoot, temporary, { recursive: true, errorOnExist: true });
    const replacements: Record<string, string> = { '{{PACKAGE_NAME}}': name, '{{PLUGIN_ID}}': id, '{{DESCRIPTION}}': options.description ?? 'Generated Hoakbot plugin', '{{LICENSE}}': options.license ?? 'UNLICENSED' };
    for (const path of ['package.json', 'hoakbot.plugin.json', 'README.md', 'LICENSE']) { const file = join(temporary, path); let content = await readFile(file, 'utf8'); for (const [from, to] of Object.entries(replacements)) content = content.replaceAll(from, to); await writeFile(file, content, { flag: 'w' }); }
    await rename(temporary, target);
  } catch (error) { await rm(temporary, { recursive: true, force: true }); throw error; }
}
