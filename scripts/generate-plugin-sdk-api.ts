import { readFile } from 'node:fs/promises';

const packageJson = JSON.parse(await readFile(new URL('../packages/plugin-sdk/package.json', import.meta.url), 'utf8'));
const api = await readFile(new URL('../docs/plugin-sdk/api.md', import.meta.url), 'utf8');
const required = ['@hoakbot/plugin-sdk', '@hoakbot/plugin-sdk/manifest-schema', '@hoakbot/plugin-sdk/testing', ...Object.keys(packageJson.exports).filter((value) => value === '.')];
const missing = required.filter((value) => !api.includes(value));
if (missing.length) { process.stderr.write(`API reference missing: ${missing.join(', ')}\n`); process.exitCode = 1; }
else process.stdout.write('Plugin SDK API reference is current.\n');
