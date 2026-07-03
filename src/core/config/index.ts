export { ConfigService } from './config.service.js';
export { JsonConfigProvider } from './json-config.provider.js';
export type { AppConfig, BotConfig, PermissionsConfig, FeatureFlagsConfig } from './types.js';
export type {
  ConfigChangeEvent,
  ConfigChangeHandler,
  ConfigChangeSource,
  ConfigEntry,
  ConfigSetOptions,
  IConfigProvider,
} from './provider.types.js';
