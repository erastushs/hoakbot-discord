export { APIClient, DashboardAPIError } from './api/client.js';
export { AuthGuard } from './auth/AuthGuard.js';
export { AuthProvider, useAuth } from './auth/AuthContext.js';
export { App } from './App.js';
export { GuildProvider, useGuild } from './guilds/GuildContext.js';
export { GuildSwitcher } from './guilds/GuildSwitcher.js';
export { DashboardHome } from './home/DashboardHome.js';
export { Breadcrumb } from './layout/Breadcrumb.js';
export { DashboardLayout } from './layout/DashboardLayout.js';
export { Sidebar } from './layout/Sidebar.js';
export { ThemeProvider, useTheme } from './layout/ThemeProvider.js';
export { TopNavigation } from './layout/TopNavigation.js';
export { SettingControl } from './settings/SettingControl.js';
export { SettingsRenderer } from './settings/SettingsRenderer.js';
export type {
  APIResponse,
  DashboardConfig,
  DashboardHomePageConfig,
  DashboardNavigationConfig,
  DashboardSettingGroup,
  DashboardSettingsConfig,
  DashboardUser,
  GuildSummary,
  ModuleCategory,
  ModuleManifest,
  SettingMetadata,
  SettingOption,
  SettingType,
} from './contracts.js';
