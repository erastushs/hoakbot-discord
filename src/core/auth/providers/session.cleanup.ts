import type { SessionRepository } from './session.repository.js';

export interface SessionCleanupOptions {
  readonly now?: () => Date;
}

export class SessionCleanupService {
  private readonly now: () => Date;

  constructor(
    private readonly repository: SessionRepository,
    options: SessionCleanupOptions = {},
  ) {
    this.now = options.now ?? (() => new Date());
  }

  cleanupExpiredSessions(): Promise<number> {
    return this.repository.deleteExpired(this.now());
  }
}
