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

export interface GetModulesResponse {
  modules: IModuleManifest[];
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
