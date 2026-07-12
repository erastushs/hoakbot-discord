const secretKey = /(?:secret|token|password|credential|private[_-]?key|api[_-]?key)/i;

export function serializeMetadata(value: unknown): unknown {
  const seen = new WeakSet<object>();
  const visit = (input: unknown): unknown => {
    if (input === null || typeof input === 'string' || typeof input === 'boolean') return input;
    if (typeof input === 'number') return Number.isFinite(input) ? input : null;
    if (typeof input === 'bigint') return input.toString();
    if (typeof input !== 'object') return undefined;
    if (seen.has(input)) return '[Circular]';
    seen.add(input);
    if (Array.isArray(input)) return input.map(visit).filter((item) => item !== undefined);
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(input)) output[key] = secretKey.test(key) ? '[REDACTED]' : visit(item);
    return output;
  };
  return visit(value);
}
