export type AuditActorType = 'user' | 'system' | 'api' | 'bot';

export interface AuditActor {
  id: string;
  type: AuditActorType;
  displayName?: string;
}

export interface AuditEntry {
  id: string;
  guildId?: string;
  module: string;
  action: string;
  actor: AuditActor;
  target?: string;
  before?: unknown;
  after?: unknown;
  metadata?: Record<string, unknown>;
  timestamp: number;
}

export interface AuditWriteOptions {
  skipPersistence?: boolean;
}

export interface AuditQuery {
  guildId?: string;
  module?: string;
  action?: string;
  actorId?: string;
  from?: number;
  to?: number;
  limit?: number;
}

export interface AuditWriter {
  write(entry: AuditEntry, options?: AuditWriteOptions): Promise<void>;
}

export interface AuditReader {
  read(query: AuditQuery): Promise<AuditEntry[]>;
}
