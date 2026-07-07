import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ConfigService } from '../../src/core/config/config.service.js';

const baseEnv = {
  BOT_TOKEN: 'bot-token',
  CLIENT_ID: 'client-id',
  DATABASE_URL: 'postgres://localhost/db',
  DASHBOARD_URL: 'https://dashboard.example.test',
};

describe('production readiness config validation', () => {
  beforeEach(() => {
    vi.stubEnv('DISCORD_CLIENT_SECRET', '');
    vi.stubEnv('DISCORD_REDIRECT_URI', '');
    vi.stubEnv('DISCORD_CLIENT_ID', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('fails production startup when OAuth secret is missing', () => {
    for (const [key, value] of Object.entries({ ...baseEnv, NODE_ENV: 'production', DISCORD_REDIRECT_URI: 'https://api.example.test/api/v1/auth/callback' })) {
      vi.stubEnv(key, value);
    }

    expect(() => new ConfigService().load()).toThrow('DISCORD_CLIENT_SECRET');
  });

  it('fails production startup when OAuth redirect URI is missing', () => {
    for (const [key, value] of Object.entries({ ...baseEnv, NODE_ENV: 'production', DISCORD_CLIENT_SECRET: 'secret' })) {
      vi.stubEnv(key, value);
    }

    expect(() => new ConfigService().load()).toThrow('DISCORD_REDIRECT_URI');
  });

  it('allows missing OAuth env in development', () => {
    for (const [key, value] of Object.entries({ ...baseEnv, NODE_ENV: 'development' })) {
      vi.stubEnv(key, value);
    }

    expect(new ConfigService().load().discord.oauth).toMatchObject({ clientSecret: '', redirectUri: '' });
  });
});
