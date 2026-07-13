import type { ISettingMetadata } from '../settings/types.js';
import type { IModuleManifest } from '../../modules/manifest.types.js';

export interface GetSettingsRequest {
  guildId: string;
}

export interface SettingValueContract {
  key: string;
  value: unknown;
  version?: number;
  updatedAt?: number;
}

export interface GetSettingsResponse {
  guildId: string;
  settings: SettingValueContract[];
  version?: number;
}

export interface PatchSettingsRequest {
  guildId: string;
  settings: Record<string, unknown>;
  expectedVersion?: number;
}

export interface PatchSettingsResponse {
  guildId: string;
  settings: SettingValueContract[];
  version?: number;
}

export interface GetManifestsResponse {
  manifests: IModuleManifest[];
}

export interface DashboardModuleContract extends IModuleManifest {
  enabled: boolean;
  available: boolean;
  health: 'available' | 'disabled' | 'unavailable';
}

export interface DashboardCapabilitiesContract {
  pluginDashboard: true;
  liveState: 'sse';
}

export interface GetModulesResponse {
  modules: readonly (IModuleManifest | DashboardModuleContract)[];
  capabilities?: DashboardCapabilitiesContract;
}

export interface SettingMetadataContract extends Omit<ISettingMetadata, 'validation'> {
  validationSchema?: Record<string, unknown>;
}

export interface GetMetadataRequest {
  moduleId?: string;
}

export interface GetMetadataResponse {
  settings: SettingMetadataContract[];
}
