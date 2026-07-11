export type SettingType =
  | 'string'
  | 'text'
  | 'number'
  | 'boolean'
  | 'select'
  | 'multiSelect'
  | 'channel'
  | 'role'
  | 'user'
  | 'emoji'
  | 'color'
  | 'image'
  | 'audio'
  | 'duration'
  | 'json'
  | 'template';

export type ModuleCategory =
  | 'core'
  | 'moderation'
  | 'utility'
  | 'engagement'
  | 'voice'
  | 'logging'
  | 'fun'
  | 'economy'
  | 'automation'
  | 'integration';

export interface DashboardNavigationConfig {
  sidebarPriority: number;
  sidebarSection: string;
  hidden?: boolean;
}

export interface DashboardHomePageConfig {
  featured: boolean;
  priority: number;
  bannerUrl?: string;
}

export interface DashboardSettingGroup {
  key: string;
  label: string;
  order?: number;
  description?: string;
}

export interface DashboardSettingsConfig {
  groups: DashboardSettingGroup[];
}

export interface DashboardConfig {
  navigation: DashboardNavigationConfig;
  homePage: DashboardHomePageConfig;
  settings: DashboardSettingsConfig;
}

export interface ModuleManifest {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  category: ModuleCategory;
  version: string;
  author: string;
  settings?: string[];
  permissions?: string[];
  commands?: string[];
  events?: string[];
  routes?: string[];
  dependencies?: string[];
  dashboard?: DashboardConfig;
  tags?: string[];
  supportsHotReload: boolean;
}

export interface SettingOption {
  label: string;
  value: string;
  description?: string;
}

export interface SettingMetadata {
  key: string;
  label: string;
  description: string;
  group: string;
  category: string;
  type: SettingType;
  defaultValue: unknown;
  placeholder?: string;
  options?: SettingOption[];
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  restartRequired?: boolean;
  advanced?: boolean;
  multiple?: boolean;
  order?: number;
}

export interface GuildSummary {
  id: string;
  name: string;
  iconUrl?: string;
}

export interface DashboardUser {
  id: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
}

export interface MeResponse {
  authenticationState: 'anonymous' | 'authenticated' | 'expired' | 'invalid';
  user?: DashboardUser;
  guilds: GuildSummary[];
  selectedGuild?: GuildSummary;
}

export interface LogoutResponse {
  authenticationState: 'anonymous';
}

export interface CsrfResponse {
  csrfToken: string;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface GetManifestsResponse {
  manifests: ModuleManifest[];
}

export interface GetModulesResponse {
  modules: ModuleManifest[];
}

export interface GetMetadataResponse {
  settings: SettingMetadata[];
}

export interface SettingValue {
  key: string;
  value: unknown;
  version?: number;
  updatedAt?: number;
}

export interface GetSettingsResponse {
  guildId: string;
  settings: SettingValue[];
}

export interface PatchSettingsResponse {
  guildId: string;
  settings: SettingValue[];
  version?: number;
}

export type DashboardLogLevel = 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

export interface DashboardLogEntry {
  id: string;
  timestamp: string;
  level: DashboardLogLevel;
  module: string;
  message: string;
  guildId?: string;
  userId?: string;
  username?: string;
  channel?: string;
  event?: string;
  path?: string;
  metadata: Record<string, unknown>;
  summary: Record<string, string>;
  raw: Record<string, unknown>;
}

export interface GetLogsResponse {
  logs: DashboardLogEntry[];
  nextCursor?: string;
  total: number;
}
