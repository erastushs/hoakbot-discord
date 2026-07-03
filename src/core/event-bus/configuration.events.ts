export type ConfigurationChangeSource = 'api' | 'bot' | 'cli' | 'file' | 'dashboard' | 'system';

export interface ConfigurationChangedEvent {
  module: string;
  guildId?: string;
  key: string;
  oldValue: unknown;
  newValue: unknown;
  source: ConfigurationChangeSource;
  timestamp: number;
}

export interface PlatformConfigurationEventMap {
  'configuration.changed': ConfigurationChangedEvent;
}
