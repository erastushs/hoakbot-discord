import { createHash } from 'node:crypto';

export type MigrationOperation =
  | Readonly<{ kind: 'createTable'; name: string; columns: Readonly<Record<string, 'text' | 'integer' | 'boolean' | 'timestamp'>> }>
  | Readonly<{ kind: 'addColumn'; table: string; name: string; type: 'text' | 'integer' | 'boolean' | 'timestamp' }>
  | Readonly<{ kind: 'createIndex'; table: string; name: string; columns: readonly string[]; unique?: boolean }>;

export interface PluginMigration {
  readonly namespace: string;
  readonly version: number;
  readonly operations: readonly MigrationOperation[];
}

export interface AppliedMigration {
  readonly namespace: string;
  readonly version: number;
  readonly checksum: string;
  readonly appliedAt: Date;
}

export interface MigrationStore {
  initialize(): Promise<void>;
  list(namespace: string): Promise<readonly AppliedMigration[]>;
  apply(migration: PluginMigration, checksum: string): Promise<void>;
}

export const pluginDataRetentionPolicy = Object.freeze({
  disable: 'retain' as const,
  uninstall: 'retain' as const,
});

export interface MigrationDiagnostic {
  readonly namespace: string;
  readonly version: number;
  readonly status: 'applied' | 'retained' | 'failed';
  readonly checksum: string;
  readonly error?: string;
}

const namespacePattern = /^[a-z0-9][a-z0-9._-]*$/;

export function migrationChecksum(migration: PluginMigration): string {
  return createHash('sha256').update(JSON.stringify(migration)).digest('hex');
}

export class PluginMigrationRunner {
  private diagnostics: MigrationDiagnostic[] = [];

  constructor(private readonly store: MigrationStore) {}

  async run(migrations: readonly PluginMigration[]): Promise<readonly MigrationDiagnostic[]> {
    this.diagnostics = [];
    await this.store.initialize();
    const ordered = [...migrations].sort((left, right) => left.namespace.localeCompare(right.namespace) || left.version - right.version);
    const identities = new Set<string>();
    for (const migration of ordered) {
      this.validate(migration);
      const identity = `${migration.namespace}:${migration.version}`;
      if (identities.has(identity)) throw new Error(`Duplicate migration "${identity}".`);
      identities.add(identity);
    }
    for (const namespace of [...new Set(ordered.map((migration) => migration.namespace))]) {
      const applied = await this.store.list(namespace);
      const byVersion = new Map(applied.map((migration) => [migration.version, migration]));
      for (const migration of ordered.filter((item) => item.namespace === namespace)) {
        const checksum = migrationChecksum(migration);
        const existing = byVersion.get(migration.version);
        if (existing) {
          if (existing.checksum !== checksum) throw new Error(`Checksum mismatch for migration "${namespace}:${migration.version}".`);
          this.diagnostics.push(Object.freeze({ namespace, version: migration.version, checksum, status: 'retained' }));
          continue;
        }
        try {
          await this.store.apply(migration, checksum);
          this.diagnostics.push(Object.freeze({ namespace, version: migration.version, checksum, status: 'applied' }));
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          this.diagnostics.push(Object.freeze({ namespace, version: migration.version, checksum, status: 'failed', error: message }));
          throw error;
        }
      }
    }
    return this.getDiagnostics();
  }

  getDiagnostics(): readonly MigrationDiagnostic[] {
    return Object.freeze(this.diagnostics.map((diagnostic) => Object.freeze({ ...diagnostic })));
  }

  private validate(migration: PluginMigration): void {
    if (!namespacePattern.test(migration.namespace)) throw new Error(`Invalid migration namespace "${migration.namespace}".`);
    if (!Number.isSafeInteger(migration.version) || migration.version < 1) throw new Error(`Invalid migration version for "${migration.namespace}".`);
    Object.freeze(migration.operations);
  }
}
