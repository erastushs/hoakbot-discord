import type { ZodTypeAny } from 'zod';

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

export type SettingDefaultSource = 'manifest' | 'config' | 'env';

export interface SettingOption {
  label: string;
  value: string;
  description?: string;
}

export interface ISettingMetadata {
  key: string;
  label: string;
  description: string;
  group: string;
  category: string;
  type: SettingType;
  defaultValue: unknown;
  placeholder?: string;
  options?: SettingOption[];
  validation?: ZodTypeAny;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  dependsOn?: string;
  visibleIf?: Record<string, unknown>;
  restartRequired?: boolean;
  advanced?: boolean;
  experimental?: boolean;
  premium?: boolean;
  secret?: boolean;
  order?: number;
  multiple?: boolean;
  defaultSource?: SettingDefaultSource;
  affects?: string;
}

export interface SettingValidationResult {
  success: boolean;
  error?: string;
}

export type SettingsChangeHandler = (key: string, value: unknown, guildId: string) => void;

export interface ISettingsRegistry {
  register(moduleId: string, settings: ISettingMetadata[]): void;
  getAll(): ISettingMetadata[];
  getByCategory(category: string): ISettingMetadata[];
  getByModule(moduleId: string): ISettingMetadata[];
  getModule(moduleId: string): ISettingMetadata[];
  getByGroup(moduleId: string, group: string): ISettingMetadata[];
  get(key: string): ISettingMetadata | undefined;
  validate(key: string, value: unknown): SettingValidationResult;
  onChange(handler: SettingsChangeHandler): () => void;
}
