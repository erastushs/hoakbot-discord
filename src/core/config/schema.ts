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
  joinDelayMs: z.number().int().min(0),
  cooldownMs: z.number().int().positive(),
  reconnectDelayMs: z.number().int().positive(),
  maxReconnectRetries: z.number().int().positive(),
  defaultSound: z.string(),
  volume: z.number().min(0).max(2),
});

const voiceLogSchema = z.object({
  enabled: z.boolean(),
  channelId: z.string(),
});

const memberLogSchema = z.object({
  enabled: z.boolean(),
  channelId: z.string(),
  roles: z.boolean().default(true),
});

const messageLogSchema = z.object({
  enabled: z.boolean(),
  channelId: z.string(),
  archiveAttachments: z.boolean(),
  maxAttachmentSizeMb: z.number().int().positive(),
});

const moderationLogSchema = z.object({
  enabled: z.boolean(),
  channelId: z.string(),
});

const loggingSchema = z.object({
  enabled: z.boolean(),
  voice: voiceLogSchema,
  member: memberLogSchema,
  message: messageLogSchema,
  moderation: moderationLogSchema,
});

const welcomeSchema = z.object({
  enabled: z.boolean(),
  channelId: z.string(),
  backgroundUrl: z.string(),
  message: z.object({
    title: z.string(),
    body: z.array(z.string()),
  }),
  image: z.object({
    title: z.string(),
    subtitle: z.string(),
  }),
});

const goodbyeSchema = z.object({
  enabled: z.boolean(),
  channelId: z.string(),
  image: z.object({
    backgroundUrl: z.string(),
    title: z.string(),
    subtitle: z.string(),
  }),
});

const botSchema = z.object({
  prefix: z.string(),
  guildId: z.string(),
  ownerIds: z.array(z.string()),
  defaultLanguage: z.string(),
  presence: presenceSchema,
  cooldowns: cooldownsSchema,
  voice: voiceSchema,
  logging: loggingSchema,
  welcome: welcomeSchema,
  goodbye: goodbyeSchema,
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
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  API_PORT: z.coerce.number().int().positive().max(65535).default(3000),
  DASHBOARD_URL: z.string().url().default('http://localhost:5173'),
  DISCORD_CLIENT_ID: z.string().optional(),
  DISCORD_CLIENT_SECRET: z.string().optional(),
  DISCORD_REDIRECT_URI: z.string().optional(),
  SESSION_DURATION: z.coerce.number().int().positive().default(1000 * 60 * 60 * 8),
  COOKIE_NAME: z.string().min(1).default('hoak_session'),
  SESSION_CLEANUP_INTERVAL: z.coerce.number().int().positive().default(1000 * 60 * 60),
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
    oauth: z.object({
      clientId: z.string(),
      clientSecret: z.string(),
      redirectUri: z.string(),
    }),
  }),
  databaseUrl: z.string(),
  api: z.object({
    port: z.number().int().positive().max(65535),
  }),
  dashboard: z.object({
    url: z.string().url(),
  }),
  session: z.object({
    durationMs: z.number().int().positive(),
    cookieName: z.string().min(1),
    cleanupIntervalMs: z.number().int().positive(),
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
