import type {
  ISettingMetadata,
  ISettingsRegistry,
  SettingValidationResult,
  SettingsChangeHandler,
} from './types.js';

export class SettingsRegistry implements ISettingsRegistry {
  private readonly settingsByKey = new Map<string, ISettingMetadata>();
  private readonly moduleSettings = new Map<string, ISettingMetadata[]>();
  private readonly changeHandlers = new Set<SettingsChangeHandler>();

  register(moduleId: string, settings: ISettingMetadata[]): void {
    if (!moduleId) {
      throw new Error('SettingsRegistry requires a non-empty module id.');
    }

    const existingModuleSettings = this.moduleSettings.get(moduleId);
    if (existingModuleSettings) {
      throw new Error(`SettingsRegistry already has settings registered for module "${moduleId}".`);
    }

    const pendingKeys = new Set<string>();

    for (const setting of settings) {
      this.validateSetting(moduleId, setting);

      if (pendingKeys.has(setting.key) || this.settingsByKey.has(setting.key)) {
        throw new Error(`Duplicate setting key "${setting.key}" registered by module "${moduleId}".`);
      }

      pendingKeys.add(setting.key);
    }

    const registeredSettings = [...settings];
    this.moduleSettings.set(moduleId, registeredSettings);

    for (const setting of registeredSettings) {
      this.settingsByKey.set(setting.key, setting);
    }
  }

  getAll(): ISettingMetadata[] {
    return [...this.settingsByKey.values()];
  }

  getByCategory(category: string): ISettingMetadata[] {
    return this.getAll().filter((setting) => setting.category === category);
  }

  getByModule(moduleId: string): ISettingMetadata[] {
    return this.getModule(moduleId);
  }

  getModule(moduleId: string): ISettingMetadata[] {
    return [...(this.moduleSettings.get(moduleId) ?? [])];
  }

  getByGroup(moduleId: string, group: string): ISettingMetadata[] {
    return this.getModule(moduleId).filter((setting) => setting.group === group);
  }

  get(key: string): ISettingMetadata | undefined {
    return this.settingsByKey.get(key);
  }

  validate(key: string, value: unknown): SettingValidationResult {
    const setting = this.get(key);

    if (!setting) {
      return { success: false, error: `Unknown setting key "${key}".` };
    }

    if (!setting.validation) {
      return { success: true };
    }

    const result = setting.validation.safeParse(value);

    if (result.success) {
      return { success: true };
    }

    return { success: false, error: result.error.issues.map((issue) => issue.message).join('; ') };
  }

  onChange(handler: SettingsChangeHandler): () => void {
    this.changeHandlers.add(handler);
    return () => {
      this.changeHandlers.delete(handler);
    };
  }

  notifyChange(key: string, value: unknown, guildId: string): void {
    for (const handler of this.changeHandlers) {
      handler(key, value, guildId);
    }
  }

  private validateSetting(moduleId: string, setting: ISettingMetadata): void {
    if (!setting.key) {
      throw new Error(`Module "${moduleId}" registered a setting without a key.`);
    }

    if (!setting.key.startsWith(`${moduleId}.`)) {
      throw new Error(
        `Setting key "${setting.key}" must be namespaced with module id "${moduleId}".`,
      );
    }
  }
}
