import type { PluginDiagnostic, PluginErrorCode } from './contracts.js';

export class PluginCoreError extends Error {
  readonly diagnostics: readonly PluginDiagnostic[];

  constructor(diagnostics: readonly PluginDiagnostic[]) {
    super(diagnostics.map((diagnostic) => diagnostic.message).join('; '));
    this.name = 'PluginCoreError';
    this.diagnostics = Object.freeze([...diagnostics]);
  }
}

export const diagnostic = (
  code: PluginErrorCode,
  message: string,
  details: Omit<PluginDiagnostic, 'code' | 'message'> = {},
): PluginDiagnostic => Object.freeze({ code, message, ...details });
