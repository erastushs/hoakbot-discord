import { randomBytes } from 'node:crypto';

import type { OAuthState } from '../auth.types.js';

export interface OAuthStateServiceOptions {
  readonly ttlMs?: number;
  readonly now?: () => Date;
  readonly randomBytes?: (size: number) => Buffer;
}

const DEFAULT_TTL_MS = 10 * 60 * 1000;
const STATE_BYTES = 32;

/**
 * Temporary in-memory OAuth state store for Phase 2.
 *
 * Phase 3 replaces or backs this with persistent session-aware storage. Values are
 * cryptographically random, expire, and are consumed exactly once.
 */
export class OAuthStateService {
  private readonly states = new Map<string, OAuthState>();
  private readonly ttlMs: number;
  private readonly now: () => Date;
  private readonly randomBytes: (size: number) => Buffer;

  constructor(options: OAuthStateServiceOptions = {}) {
    this.ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
    this.now = options.now ?? (() => new Date());
    this.randomBytes = options.randomBytes ?? randomBytes;
  }

  createState(redirectPath?: string): OAuthState {
    this.deleteExpired();

    const createdAt = this.now();
    const state: OAuthState = {
      value: this.randomBytes(STATE_BYTES).toString('base64url'),
      createdAt,
      expiresAt: new Date(createdAt.getTime() + this.ttlMs),
      redirectPath,
    };

    this.states.set(state.value, state);
    return state;
  }

  consumeState(value: string | undefined): OAuthState | undefined {
    if (!value) {
      return undefined;
    }

    const state = this.states.get(value);
    this.states.delete(value);

    if (!state || state.expiresAt.getTime() <= this.now().getTime()) {
      return undefined;
    }

    return state;
  }

  size(): number {
    this.deleteExpired();
    return this.states.size;
  }

  private deleteExpired(): void {
    const now = this.now().getTime();
    for (const [value, state] of this.states) {
      if (state.expiresAt.getTime() <= now) {
        this.states.delete(value);
      }
    }
  }
}
