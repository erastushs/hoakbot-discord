export interface PresenceConfig {
  type: string;
  text: string;
}

export interface CooldownsConfig {
  global: number;
  perUser: number;
}

export interface VoiceConfig {
  standbyChannelId: string;
  joinDelayMs: number;
  cooldownMs: number;
  reconnectDelayMs: number;
  maxReconnectRetries: number;
  defaultSound: string;
  volume: number;
}

export interface VoiceLogConfig {
  enabled: boolean;
  channelId: string;
}

export interface MemberLogConfig {
  enabled: boolean;
  channelId: string;
  roles: boolean;
}

export interface MessageLogConfig {
  enabled: boolean;
  channelId: string;
  archiveAttachments: boolean;
  maxAttachmentSizeMb: number;
}

export interface LoggingConfig {
  enabled: boolean;
  voice: VoiceLogConfig;
  member: MemberLogConfig;
  message: MessageLogConfig;
  moderation: ModerationLogConfig;
}

export interface ModerationLogConfig {
  enabled: boolean;
  channelId: string;
}

export interface WelcomeMessageConfig {
  title: string;
  body: string[];
}

export interface WelcomeImageConfig {
  title: string;
  subtitle: string;
}

export interface WelcomeConfig {
  enabled: boolean;
  channelId: string;
  backgroundUrl: string;
  message: WelcomeMessageConfig;
  image: WelcomeImageConfig;
}

export interface GoodbyeImageConfig {
  backgroundUrl: string;
  title: string;
  subtitle: string;
}

export interface GoodbyeConfig {
  enabled: boolean;
  channelId: string;
  image: GoodbyeImageConfig;
}

export interface BotConfig {
  prefix: string;
  guildId: string;
  ownerIds: string[];
  defaultLanguage: string;
  presence: PresenceConfig;
  cooldowns: CooldownsConfig;
  voice: VoiceConfig;
  logging: LoggingConfig;
  welcome: WelcomeConfig;
  goodbye: GoodbyeConfig;
}

export interface PermissionsConfig {
  roles: {
    administrator: string[];
    moderator: string[];
    trusted: string[];
  };
}

export interface FeatureFlagsConfig {
  modules: Record<string, boolean>;
}

export interface AppConfig {
  bot: BotConfig;
  permissions: PermissionsConfig;
  featureFlags: FeatureFlagsConfig;
  discord: {
    token: string;
    clientId: string;
    oauth?: {
      clientId: string;
      clientSecret: string;
      redirectUri: string;
    };
  };
  databaseUrl: string;
  api: {
    port: number;
  };
  dashboard?: {
    url: string;
    allowedOrigin: string;
  };
  trustProxy: boolean;
  session?: {
    durationMs: number;
    cookieName: string;
    cleanupIntervalMs: number;
  };
  env: {
    nodeEnv: string;
    logLevel: string;
  };
  guildId: string;
  ownerIds: string[];
}
