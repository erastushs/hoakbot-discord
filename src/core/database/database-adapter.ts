import type { Sql } from 'postgres';

export interface ConnectionCheckResult {
  success: boolean;
  latencyMs: number;
  error?: string;
}

export interface IDatabaseAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  checkConnection(): Promise<ConnectionCheckResult>;
  getClient(): Sql;
  isConnected(): boolean;
}
