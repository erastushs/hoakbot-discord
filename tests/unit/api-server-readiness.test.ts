import { describe, expect, it } from 'vitest';
import type { IncomingMessage } from 'node:http';

import { clientIp, resolveAllowedOrigin } from '../../src/core/api/server.js';

function request(headers: Record<string, string | undefined>, remoteAddress = '127.0.0.1'): IncomingMessage {
  return {
    headers,
    socket: { remoteAddress },
  } as IncomingMessage;
}

describe('API server production readiness policy', () => {
  it('allows localhost origins in development', () => {
    expect(resolveAllowedOrigin('http://localhost:5173', { nodeEnv: 'development', allowedOrigin: 'http://localhost:5173' })).toBe('http://localhost:5173');
    expect(resolveAllowedOrigin('http://127.0.0.1:5173', { nodeEnv: 'development', allowedOrigin: 'http://localhost:5173' })).toBe('http://127.0.0.1:5173');
  });

  it('allows only configured origin in production', () => {
    expect(resolveAllowedOrigin('https://dashboard.example.test', { nodeEnv: 'production', allowedOrigin: 'https://dashboard.example.test' })).toBe('https://dashboard.example.test');
  });

  it('rejects unconfigured origins in production', () => {
    expect(resolveAllowedOrigin('https://evil.example.test', { nodeEnv: 'production', allowedOrigin: 'https://dashboard.example.test' })).toBeUndefined();
  });

  it('rejects spoofed X-Forwarded-For when trust proxy is disabled', () => {
    expect(clientIp(request({ 'x-forwarded-for': '203.0.113.10' }, '127.0.0.1'), false)).toBe('127.0.0.1');
  });

  it('uses X-Forwarded-For when trust proxy is enabled', () => {
    expect(clientIp(request({ 'x-forwarded-for': '203.0.113.10, 127.0.0.1' }, '127.0.0.1'), true)).toBe('203.0.113.10');
  });
});
