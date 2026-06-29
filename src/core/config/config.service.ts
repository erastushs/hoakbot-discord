import { config as loadEnv } from 'dotenv';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { envSchema, appConfigSchema } from './schema.js';
import type { AppConfig } from './types.js';

export class ConfigService {
  private config: AppConfig | null = null;

  load(): Readonly<AppConfig> {
    if (this.config) {
      return this.config;
    }

    loadEnv();

    const env = this.parseEnv();
    const bot = this.readJsonFile('bot.json');
    const permissions = this.readJsonFile('permissions.json');
    const featureFlags = this.readJsonFile('feature-flags.json');

    const merged = this.buildConfig(env, bot, permissions, featureFlags);
    const parsed = appConfigSchema.parse(merged);

    this.config = Object.freeze(parsed);
    return this.config;
  }

  get(): Readonly<AppConfig> {
    if (!this.config) {
      throw new Error('ConfigService has not been loaded. Call load() first.');
    }
    return this.config;
  }

  private parseEnv() {
    const raw = {
      BOT_TOKEN: process.env['BOT_TOKEN'],
      CLIENT_ID: process.env['CLIENT_ID'],
      SUPABASE_URL: process.env['SUPABASE_URL'],
      SUPABASE_SERVICE_ROLE_KEY: process.env['SUPABASE_SERVICE_ROLE_KEY'],
      NODE_ENV: process.env['NODE_ENV'],
      LOG_LEVEL: process.env['LOG_LEVEL'],
      GUILD_ID: process.env['GUILD_ID'],
      OWNER_IDS: process.env['OWNER_IDS'],
    };

    return envSchema.parse(raw);
  }

  private readJsonFile(filename: string): Record<string, unknown> {
    const filePath = resolve('config', filename);
    const raw = readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as Record<string, unknown>;
  }

  private buildConfig(
    env: ReturnType<typeof this.parseEnv>,
    bot: Record<string, unknown>,
    permissions: Record<string, unknown>,
    featureFlags: Record<string, unknown>,
  ) {
    const guildId = env.GUILD_ID ?? (bot['guildId'] as string | undefined) ?? '';
    const ownerIds = env.OWNER_IDS
      ? env.OWNER_IDS.split(',')
          .map((id: string) => id.trim())
          .filter(Boolean)
      : ((bot['ownerIds'] as string[] | undefined) ?? []);

    return {
      bot,
      permissions,
      featureFlags,
      discord: {
        token: env.BOT_TOKEN,
        clientId: env.CLIENT_ID,
      },
      supabase: {
        url: env.SUPABASE_URL,
        serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
      },
      env: {
        nodeEnv: env.NODE_ENV,
        logLevel: env.LOG_LEVEL,
      },
      guildId,
      ownerIds,
    };
  }
}
