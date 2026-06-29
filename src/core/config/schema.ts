import { z } from 'zod';

export const presenceSchema = z.object({
  type: z.string(),
  text: z.string(),
});

const cooldownsSchema = z.object({
  global: z.number().int().positive(),
  perUser: z.number().int().positive(),
});

const voiceSchema = z.object({
  standbyChannelId: z.string(),
  cooldownMs: z.number().int().positive(),
  reconnectDelayMs: z.number().int().positive(),
  maxReconnectRetries: z.number().int().positive(),
});

const botSchema = z.object({
  prefix: z.string(),
  guildId: z.string(),
  ownerIds: z.array(z.string()),
  defaultLanguage: z.string(),
  presence: presenceSchema,
  cooldowns: cooldownsSchema,
  voice: voiceSchema,
});

const permissionsSchema = z.object({
  roles: z.object({
    administrator: z.array(z.string()),
    moderator: z.array(z.string()),
    trusted: z.array(z.string()),
  }),
});

const featureFlagsSchema = z.object({
  modules: z.record(z.string(), z.boolean()),
});

export const envSchema = z.object({
  BOT_TOKEN: z.string().min(1, 'BOT_TOKEN is required'),
  CLIENT_ID: z.string().min(1, 'CLIENT_ID is required'),
  SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
  NODE_ENV: z.enum(['development', 'production']).default('production'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  GUILD_ID: z.string().optional(),
  OWNER_IDS: z.string().optional(),
});

export const appConfigSchema = z.object({
  bot: botSchema,
  permissions: permissionsSchema,
  featureFlags: featureFlagsSchema,
  discord: z.object({
    token: z.string(),
    clientId: z.string(),
  }),
  supabase: z.object({
    url: z.string(),
    serviceRoleKey: z.string(),
  }),
  env: z.object({
    nodeEnv: z.string(),
    logLevel: z.string(),
  }),
  guildId: z.string(),
  ownerIds: z.array(z.string()),
});

export type EnvSchema = z.infer<typeof envSchema>;
export type BotConfigSchema = z.infer<typeof botSchema>;
