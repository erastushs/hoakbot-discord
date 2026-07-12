import type { Sql } from 'postgres';
import type { AppliedMigration, MigrationOperation, MigrationStore, PluginMigration } from './migrations.js';

const identifierPattern = /^[a-z_][a-z0-9_]*$/;
const sqlTypes = { text: 'TEXT', integer: 'INTEGER', boolean: 'BOOLEAN', timestamp: 'TIMESTAMPTZ' } as const;

export class PostgresMigrationStore implements MigrationStore {
  constructor(private readonly sql: Sql) {}

  async initialize(): Promise<void> {
    await this.sql`CREATE TABLE IF NOT EXISTS plugin_migrations (namespace TEXT NOT NULL, version INTEGER NOT NULL, checksum TEXT NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY (namespace, version))`;
  }

  async list(namespace: string): Promise<readonly AppliedMigration[]> {
    const rows = await this.sql<{ namespace: string; version: number; checksum: string; applied_at: Date }[]>`SELECT namespace, version, checksum, applied_at FROM plugin_migrations WHERE namespace = ${namespace} ORDER BY version`;
    return rows.map((row) => Object.freeze({ namespace: row.namespace, version: row.version, checksum: row.checksum, appliedAt: row.applied_at }));
  }

  async apply(migration: PluginMigration, checksum: string): Promise<void> {
    await this.sql.begin(async (transaction) => {
      for (const operation of migration.operations) await transaction.unsafe(this.render(migration.namespace, operation));
      await transaction`INSERT INTO plugin_migrations (namespace, version, checksum) VALUES (${migration.namespace}, ${migration.version}, ${checksum})`;
    });
  }

  private render(namespace: string, operation: MigrationOperation): string {
    if (operation.kind === 'createTable') {
      const columns = Object.entries(operation.columns).map(([name, type]) => `${this.identifier(name)} ${sqlTypes[type]}`).join(', ');
      return `CREATE TABLE IF NOT EXISTS ${this.objectIdentifier(namespace, operation.name)} (${columns})`;
    }
    if (operation.kind === 'addColumn') return `ALTER TABLE ${this.objectIdentifier(namespace, operation.table)} ADD COLUMN IF NOT EXISTS ${this.identifier(operation.name)} ${sqlTypes[operation.type]}`;
    const unique = operation.unique ? 'UNIQUE ' : '';
    return `CREATE ${unique}INDEX IF NOT EXISTS ${this.objectIdentifier(namespace, operation.name)} ON ${this.objectIdentifier(namespace, operation.table)} (${operation.columns.map((column) => this.identifier(column)).join(', ')})`;
  }

  private objectIdentifier(namespace: string, value: string): string {
    if (!/^[a-z0-9][a-z0-9._-]*$/.test(namespace)) throw new Error(`Invalid migration namespace "${namespace}".`);
    if (!identifierPattern.test(value)) throw new Error(`Unsafe migration identifier "${value}".`);
    const normalized = namespace.replace(/[^a-z0-9]/g, '_');
    const hash = [...namespace].reduce((value, character) => Math.imul(value ^ character.charCodeAt(0), 16777619), 2166136261) >>> 0;
    return this.identifier(`plugin_${normalized}_${hash.toString(16).padStart(8, '0')}__${value}`);
  }

  private identifier(value: string): string {
    if (!identifierPattern.test(value)) throw new Error(`Unsafe migration identifier "${value}".`);
    return `"${value}"`;
  }
}
