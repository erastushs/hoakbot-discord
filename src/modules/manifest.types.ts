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

export interface IModuleManifest {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  category: ModuleCategory;
  version: string;
  author: string;
  license?: string;
  settings?: string[];
  permissions?: string[];
  commands?: string[];
  events?: string[];
  routes?: string[];
  metrics?: string[];
  migrations?: string[];
  featureFlags?: string[];
  healthChecks?: string[];
  dependencies?: string[];
  dashboard?: DashboardConfig;
  tags?: string[];
  supportsHotReload: boolean;
  requiredDiscordPermissions?: string;
  documentation?: string;
}
