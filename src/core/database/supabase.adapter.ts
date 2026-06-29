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
    const { url, serviceRoleKey } = this.config.supabase;
    if (!url || !serviceRoleKey) {
      throw new ConfigurationError('Missing Supabase configuration (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)');
    }

    this.logger.info({ url: this.sanitizeUrl(url) }, 'Connecting to Supabase PostgreSQL');

    try {
      const connectionUrl = this.buildConnectionUrl(url, serviceRoleKey);
      this.sql = postgres(connectionUrl, {
        max: 5,
        idle_timeout: 30,
        connect_timeout: 10,
        debug: false,
      });

      await this.checkConnection();
      this.connected = true;
      this.logger.info('Supabase PostgreSQL connected');
    } catch (error) {
      this.logger.error({ error }, 'Failed to connect to Supabase PostgreSQL');
      throw new DatabaseConnectionError('Failed to connect to Supabase PostgreSQL', error);
    }
  }

  async disconnect(): Promise<void> {
    if (this.sql) {
      await this.sql.end();
      this.sql = null;
      this.connected = false;
      this.logger.info('Supabase PostgreSQL disconnected');
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

  private buildConnectionUrl(url: string, serviceRoleKey: string): string {
    try {
      const parsed = new URL(url);
      parsed.username = 'postgres';
      parsed.password = serviceRoleKey;
      return parsed.toString();
    } catch {
      throw new ConfigurationError('Invalid SUPABASE_URL format');
    }
  }

  private sanitizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      return `${parsed.protocol}//${parsed.hostname}:${parsed.port}`;
    } catch {
      return url;
    }
  }
}
