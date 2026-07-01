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

export interface BotConfig {
  prefix: string;
  guildId: string;
  ownerIds: string[];
  defaultLanguage: string;
  presence: PresenceConfig;
  cooldowns: CooldownsConfig;
  voice: VoiceConfig;
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
  };
  databaseUrl: string;
  env: {
    nodeEnv: string;
    logLevel: string;
  };
  guildId: string;
  ownerIds: string[];
}
