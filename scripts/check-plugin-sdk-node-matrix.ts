const supported = [22, 24, 26];
const current = Number(process.versions.node.split('.')[0]);
if (!supported.includes(current)) { process.stderr.write(`Unsupported Node ${current}; expected ${supported.join(', ')}\n`); process.exitCode = 1; }
else process.stdout.write(JSON.stringify({ ok: true, current, supported, module: 'ESM', commonjs: false }) + '\n');
