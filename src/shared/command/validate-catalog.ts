import type { CommandDescriptor } from './define-command.js';
import { validateCommandDescriptors } from './validate-command.js';

export interface PackagedCommandCatalog {
  readonly packageId: string;
  readonly commands: readonly CommandDescriptor[];
}

export function validateCompleteCommandCatalog(
  generated: readonly CommandDescriptor[],
  packaged: readonly PackagedCommandCatalog[] = [],
): readonly CommandDescriptor[] {
  const descriptors = [...generated];
  const packageIds = new Set<string>();
  for (const catalog of packaged) {
    if (!/^[a-z0-9][a-z0-9._-]*$/.test(catalog.packageId) || packageIds.has(catalog.packageId))
      throw new Error(`Invalid packaged command catalog: ${catalog.packageId}`);
    packageIds.add(catalog.packageId);
    if (catalog.commands.some(({ metadata }) => metadata.owner !== catalog.packageId))
      throw new Error(`Packaged command owner mismatch: ${catalog.packageId}`);
    descriptors.push(...catalog.commands);
  }
  validateCommandDescriptors(descriptors);
  return Object.freeze(descriptors);
}
