import { readFile } from 'node:fs/promises';

const packageJson = JSON.parse(await readFile(new URL('../packages/plugin-sdk/package.json', import.meta.url), 'utf8'));
const index = await readFile(new URL('../packages/plugin-sdk/src/index.ts', import.meta.url), 'utf8');
const testing = await readFile(new URL('../packages/plugin-sdk/src/testing.ts', import.meta.url), 'utf8');
const api = await readFile(new URL('../docs/plugin-sdk/api.md', import.meta.url), 'utf8');
const names = (source: string): string[] => [...source.matchAll(/export (?:type )?\{([^}]+)\}/g)].flatMap((match) => match[1].split(',').map((value) => value.trim())).filter(Boolean);
const testingNames = [...testing.matchAll(/export (?:interface|function) ([A-Za-z0-9_]+)/g)].map((match) => match[1]);
const required = [...Object.keys(packageJson.exports).map((value) => value === '.' ? '@hoakbot/plugin-sdk' : `@hoakbot/plugin-sdk${value.slice(1)}`), ...names(index), ...testingNames];
const missing = required.filter((value) => !api.includes(`\`${value}\``) && !api.includes(`\`${value}(`));
if (missing.length) { process.stderr.write(`API reference missing: ${missing.join(', ')}\n`); process.exitCode = 1; }
else process.stdout.write('Plugin SDK API reference is current.\n');
