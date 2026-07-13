import { EventEmitter } from 'node:events';

import type { LogSink, LogSinkLevel } from '../logger/logger.service.js';

export type DashboardLogLevel = 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

export interface DashboardLogEntry {
  id: string;
  timestamp: string;
  level: DashboardLogLevel;
  module: string;
  message: string;
  guildId?: string;
  userId?: string;
  username?: string;
  channel?: string;
  event?: string;
  path?: string;
  metadata: Record<string, unknown>;
  summary: Record<string, string>;
  raw: Record<string, unknown>;
}

export interface LogsQuery {
  guildId?: string;
  levels?: DashboardLogLevel[];
  modules?: string[];
  search?: string;
  since?: number;
  limit?: number;
  cursor?: string;
}

export interface LogsResult {
  logs: DashboardLogEntry[];
  nextCursor?: string;
  total: number;
}

const DEFAULT_CAPACITY = 2_000;
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 1_000;
const MODULE_NAMES = ['Voice', 'Welcome', 'Goodbye', 'Logging', 'Moderation', 'Shrine', 'Security', 'Dashboard', 'API', 'Database', 'Scheduler'];
const SENSITIVE_KEY_PATTERN = /(authorization|cookie|csrf|session|token|secret|password|passwd|oauth|api[_-]?key)/i;
const SUMMARY_SKIP_KEYS = new Set(['level', 'time', 'timestamp', 'msg', 'message', 'module', 'error', 'err']);

export class LogsService implements LogSink {
  private readonly entries: DashboardLogEntry[] = [];
  private readonly events = new EventEmitter();
  private sequence = 0;

  constructor(private readonly capacity = DEFAULT_CAPACITY) {}

  write(level: LogSinkLevel, args: unknown[]): void {
    const entry = this.toEntry(level, args);
    this.entries.push(entry);
    if (this.entries.length > this.capacity) {
      this.entries.splice(0, this.entries.length - this.capacity);
    }

    this.events.emit('entry', entry);
  }

  queryGuild(guildId: string, query: Omit<LogsQuery, 'guildId'> = {}): LogsResult {
    return this.query({ ...query, guildId });
  }

  query(query: LogsQuery = {}): LogsResult {
    const limit = clampLimit(query.limit);
    const search = query.search?.trim().toLowerCase();
    const levels = new Set(query.levels ?? []);
    const modules = new Set((query.modules ?? []).map(normalizeModuleName));
    const guildEntries = query.guildId ? this.entries.filter((entry) => entry.guildId === query.guildId) : [];
    const cursorIndex = query.cursor ? guildEntries.findIndex((entry) => entry.id === query.cursor) : -1;
    const candidates = cursorIndex >= 0 ? guildEntries.slice(0, cursorIndex) : guildEntries;
    const filtered = candidates.filter((entry) => {
      if (levels.size > 0 && !levels.has(entry.level)) return false;
      if (modules.size > 0 && !modules.has(normalizeModuleName(entry.module))) return false;
      if (query.since && Date.parse(entry.timestamp) < query.since) return false;
      if (search && !searchableText(entry).includes(search)) return false;
      return true;
    });
    const logs = filtered.slice(-limit).reverse();

    return {
      logs,
      nextCursor: logs.length === limit ? logs[logs.length - 1]?.id : undefined,
      total: filtered.length,
    };
  }

  subscribeGuild(guildId: string, listener: (entry: DashboardLogEntry) => void): () => void {
    const scopedListener = (entry: DashboardLogEntry) => {
      if (entry.guildId === guildId) listener(entry);
    };
    this.events.on('entry', scopedListener);
    return () => this.events.off('entry', scopedListener);
  }

  private toEntry(level: LogSinkLevel, args: unknown[]): DashboardLogEntry {
    this.sequence += 1;
    const timestamp = new Date().toISOString();
    const objectArg = isRecord(args[0]) ? args[0] : undefined;
    const messageArg = typeof args[0] === 'string' ? args[0] : typeof args[1] === 'string' ? args[1] : undefined;
    const metadata = sanitizeRecord(objectArg ?? {});
    const message = messageArg ?? messageFromMetadata(metadata) ?? '(no message)';
    const module = normalizeModuleName(readString(metadata, 'module') ?? inferModule(message, metadata));
    const raw = sanitizeRecord({ level: level.toUpperCase(), timestamp, message, ...metadata });

    return {
      id: `${Date.now().toString(36)}-${this.sequence.toString(36)}`,
      timestamp,
      level: level.toUpperCase() as DashboardLogLevel,
      module,
      message,
      guildId: readString(metadata, 'guildId'),
      userId: readString(metadata, 'userId'),
      username: readString(metadata, 'username'),
      channel: readString(metadata, 'channel') ?? readString(metadata, 'channelId'),
      event: readString(metadata, 'event'),
      path: readString(metadata, 'path'),
      metadata,
      summary: summaryFields(metadata),
      raw,
    };
  }
}

function clampLimit(limit: number | undefined): number {
  if (!Number.isFinite(limit)) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(1, Math.trunc(limit ?? DEFAULT_LIMIT)));
}

function sanitizeRecord(record: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(record).map(([key, value]) => [key, sanitizeValue(key, value)]));
}

function sanitizeValue(key: string, value: unknown): unknown {
  if (SENSITIVE_KEY_PATTERN.test(key)) return '[masked]';
  if (Array.isArray(value)) return value.map((entry) => sanitizeValue(key, entry));
  if (isRecord(value)) return sanitizeRecord(value);
  if (value instanceof Error) return { name: value.name, message: value.message, stack: value.stack ? '[masked]' : undefined };
  return value;
}

function summaryFields(metadata: Record<string, unknown>): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (SUMMARY_SKIP_KEYS.has(key) || value === undefined || value === null || isRecord(value) || Array.isArray(value)) continue;
    fields[key] = String(value);
    if (Object.keys(fields).length >= 6) break;
  }

  return fields;
}

function searchableText(entry: DashboardLogEntry): string {
  return [
    entry.message,
    entry.guildId,
    entry.userId,
    entry.username,
    entry.channel,
    entry.module,
    entry.event,
    entry.path,
    JSON.stringify(entry.summary),
  ].filter(Boolean).join(' ').toLowerCase();
}

function messageFromMetadata(metadata: Record<string, unknown>): string | undefined {
  return readString(metadata, 'msg') ?? readString(metadata, 'message');
}

function inferModule(message: string, metadata: Record<string, unknown>): string {
  const path = readString(metadata, 'path');
  if (path?.startsWith('/api/')) return 'API';
  for (const module of MODULE_NAMES) {
    if (message.toLowerCase().includes(module.toLowerCase())) return module;
  }

  return 'Dashboard';
}

function normalizeModuleName(module: string): string {
  const matched = MODULE_NAMES.find((candidate) => candidate.toLowerCase() === module.toLowerCase());
  return matched ?? module.charAt(0).toUpperCase() + module.slice(1);
}

function readString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
