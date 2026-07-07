import { randomBytes, timingSafeEqual } from 'node:crypto';

import type { SessionRecord } from '../auth/index.js';

const TOKEN_BYTES = 32;
const DEFAULT_TOKEN_TTL_MS = 1000 * 60 * 60 * 8;
const CSRF_METADATA_KEY = 'csrf';

export interface CsrfSessionMetadata {
  readonly token: string;
  readonly expiresAt: string;
}

export interface CsrfServiceOptions {
  readonly now?: () => Date;
  readonly randomBytes?: (size: number) => Buffer;
  readonly tokenTtlMs?: number;
}

export class CsrfService {
  private readonly now: () => Date;
  private readonly randomBytes: (size: number) => Buffer;
  private readonly tokenTtlMs: number;

  constructor(options: CsrfServiceOptions = {}) {
    this.now = options.now ?? (() => new Date());
    this.randomBytes = options.randomBytes ?? randomBytes;
    this.tokenTtlMs = options.tokenTtlMs ?? DEFAULT_TOKEN_TTL_MS;
  }

  generateToken(): CsrfSessionMetadata {
    const now = this.now();
    return {
      token: this.randomBytes(TOKEN_BYTES).toString('base64url'),
      expiresAt: new Date(now.getTime() + this.tokenTtlMs).toISOString(),
    };
  }

  attachToMetadata(metadata: Record<string, unknown> | undefined, csrf = this.generateToken()): Record<string, unknown> {
    return { ...(metadata ?? {}), [CSRF_METADATA_KEY]: csrf };
  }

  invalidateMetadata(metadata: Record<string, unknown> | undefined): Record<string, unknown> {
    const next = { ...(metadata ?? {}) };
    delete next[CSRF_METADATA_KEY];
    return next;
  }

  readToken(session: SessionRecord): string | undefined {
    const csrf = readCsrfMetadata(session.metadata?.[CSRF_METADATA_KEY]);
    return csrf && !this.isExpired(csrf, session) ? csrf.token : undefined;
  }

  validate(session: SessionRecord, providedToken: string | undefined): boolean {
    if (!providedToken) {
      return false;
    }

    const csrf = readCsrfMetadata(session.metadata?.[CSRF_METADATA_KEY]);
    if (!csrf || this.isExpired(csrf, session)) {
      return false;
    }

    return constantTimeEqual(csrf.token, providedToken);
  }

  isExpired(csrf: CsrfSessionMetadata, session: Pick<SessionRecord, 'expiresAt'>): boolean {
    const now = this.now().getTime();
    const tokenExpiresAt = Date.parse(csrf.expiresAt);
    return Number.isNaN(tokenExpiresAt) || tokenExpiresAt <= now || session.expiresAt.getTime() <= now;
  }
}

function readCsrfMetadata(value: unknown): CsrfSessionMetadata | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  if (typeof record['token'] !== 'string' || typeof record['expiresAt'] !== 'string') {
    return undefined;
  }

  return { token: record['token'], expiresAt: record['expiresAt'] };
}

function constantTimeEqual(expected: string, actual: string): boolean {
  const expectedBuffer = Buffer.from(expected, 'utf8');
  const actualBuffer = Buffer.from(actual, 'utf8');
  if (expectedBuffer.length !== actualBuffer.length) {
    timingSafeEqual(expectedBuffer, expectedBuffer);
    return false;
  }

  return timingSafeEqual(expectedBuffer, actualBuffer);
}
