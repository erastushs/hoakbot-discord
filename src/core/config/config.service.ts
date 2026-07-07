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
      DATABASE_URL: process.env['DATABASE_URL'],
      API_PORT: process.env['API_PORT'],
      DISCORD_CLIENT_ID: process.env['DISCORD_CLIENT_ID'],
      DISCORD_CLIENT_SECRET: process.env['DISCORD_CLIENT_SECRET'],
      DISCORD_REDIRECT_URI: process.env['DISCORD_REDIRECT_URI'],
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
        oauth: {
          clientId: env.DISCORD_CLIENT_ID ?? env.CLIENT_ID,
          clientSecret: env.DISCORD_CLIENT_SECRET ?? '',
          redirectUri: env.DISCORD_REDIRECT_URI ?? '',
        },
      },
      databaseUrl: env.DATABASE_URL,
      api: {
        port: env.API_PORT,
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
