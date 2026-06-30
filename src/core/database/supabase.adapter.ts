import postgres from 'postgres';
import type { Sql } from 'postgres';
import type { AppConfig } from '../config/types.js';
import type { ILogger } from '../logger/logger.service.js';
import { DatabaseConnectionError, ConfigurationError } from '../errors/types.js';
import type { ConnectionCheckResult, IDatabaseAdapter } from './database-adapter.js';

export class SupabaseAdapter implements IDatabaseAdapter {
  private sql: Sql | null = null;
  private connected = false;

  constructor(
    private readonly config: Readonly<AppConfig>,
    private readonly logger: ILogger,
  ) {}

  async connect(): Promise<void> {
    const { databaseUrl } = this.config;
    if (!databaseUrl) {
      throw new ConfigurationError('Missing DATABASE_URL configuration');
    }

    this.logger.info('Connecting to PostgreSQL database');

    try {
      this.sql = postgres(databaseUrl, {
        max: 5,
        idle_timeout: 30,
        connect_timeout: 10,
        debug: false,
      });

      const result = await this.checkConnection();
      if (!result.success) {
        throw new DatabaseConnectionError(`Database connection check failed: ${result.error ?? 'Unknown error'}`);
      }
      this.connected = true;
      this.logger.info({ latencyMs: result.latencyMs }, 'PostgreSQL connected');
    } catch (error) {
      this.logger.error({ error }, 'Failed to connect to PostgreSQL');
      throw new DatabaseConnectionError('Failed to connect to PostgreSQL', error);
    }
  }

  async disconnect(): Promise<void> {
    if (this.sql) {
      await this.sql.end();
      this.sql = null;
      this.connected = false;
      this.logger.info('PostgreSQL disconnected');
    }
  }

  async checkConnection(): Promise<ConnectionCheckResult> {
    if (!this.sql) {
      return { success: false, latencyMs: 0, error: 'Client not initialized' };
    }

    const start = performance.now();
    try {
      await this.sql`SELECT 1`;
      const latencyMs = Math.round(performance.now() - start);
      this.logger.debug({ latencyMs }, 'Database connection check');
      return { success: true, latencyMs };
    } catch (error) {
      const latencyMs = Math.round(performance.now() - start);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, latencyMs, error: message };
    }
  }

  getClient(): Sql {
    if (!this.sql) {
      throw new DatabaseConnectionError('Database client not initialized. Call connect() first.');
    }
    return this.sql;
  }

  isConnected(): boolean {
    return this.connected;
  }
}
