import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

export function generateCommandCatalog(root: string): string {
  const locations = ['src/modules/general/commands', 'src/modules/moderation/commands'];
  const files = locations
    .flatMap((location) =>
      readdirSync(resolve(root, location))
        .filter((file) => file.endsWith('.command.ts'))
        .map((file) => `${location}/${file}`),
    )
    .sort();
  const sources = files.map((file) => ({ file, source: readFileSync(resolve(root, file), 'utf8') }));
  const entries = sources.map(({ file, source }, index) => {
    const className = source.match(/export class (\w+Command)\b/)?.[1];
    if (!className) throw new Error(`Command source does not export a *Command class: ${file}`);
    const owner = file.includes('/general/')
      ? 'builtin.general'
      : file.includes('/moderation/')
        ? 'builtin.moderation'
        : null;
    if (!owner) throw new Error(`Command source is outside an approved owner location: ${file}`);
    const parameter = source.match(/constructor\(private readonly \w+: ([^)]+)\)/)?.[1];
    const dependency =
      parameter === 'Readonly<AppConfig>'
        ? 'config'
        : parameter === 'HelpService'
          ? 'helpService'
          : parameter === 'IMetrics'
            ? 'metrics'
            : parameter === 'WarningService'
              ? 'warningService'
              : parameter
                ? null
                : undefined;
    if (dependency === null) throw new Error(`Command constructor has an unsupported dependency: ${file}`);
    return { file, className, owner, dependency, alias: `Command${index}` };
  });
  const hash = createHash('sha256')
    .update(sources.map(({ file, source }) => `${file}\0${source}`).join('\0'))
    .digest('hex');
  const imports = entries
    .map(({ file, className, alias }) => `import { ${className} as ${alias} } from '../${file.slice(4, -3)}.js';`)
    .join('\n');
  const factories = entries
    .map(
      ({ alias, dependency }, index) =>
        `export const createCommand${index}: BuiltinCommandFactory = (${dependency ? 'dependencies' : '_dependencies'}) => new ${alias}(${dependency ? `dependencies.${dependency}` : ''});`,
    )
    .join('\n');
  const catalog = entries
    .map(
      ({ file, owner }, index) =>
        `  Object.freeze({ source: '${file}', owner: '${owner}', create: createCommand${index} }),`,
    )
    .join('\n');
  return `import type { BuiltinCommandFactory } from '../shared/command/builtin-commands.js';\n${imports}\n\n${factories}\n\nexport const builtinCommandCatalog = Object.freeze([\n${catalog}\n] as const);\nexport const builtinCommandFiles = Object.freeze(builtinCommandCatalog.map(({ source }) => source));\nexport const builtinCommandCatalogHash = '${hash}';\n`;
}

export function commandCatalogIsCurrent(root: string): boolean {
  return readFileSync(resolve(root, 'src/generated/command-catalog.ts'), 'utf8') === generateCommandCatalog(root);
}

const root = resolve(import.meta.dirname, '..');
if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const target = resolve(root, 'src/generated/command-catalog.ts');
  if (process.argv.includes('--check')) {
    if (!commandCatalogIsCurrent(root))
      throw new Error('Generated command catalog is stale. Run npm run generate:commands.');
  } else writeFileSync(target, generateCommandCatalog(root));
}
