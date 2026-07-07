import type { ILogger } from '../../logger/logger.service.js';
import type { SessionCleanupService } from './session.cleanup.js';

export interface SessionCleanupSchedulerOptions {
  readonly intervalMs: number;
}

export class SessionCleanupScheduler {
  private timer: NodeJS.Timeout | undefined;

  constructor(
    private readonly cleanup: SessionCleanupService,
    private readonly logger: Pick<ILogger, 'error' | 'info'>,
    private readonly options: SessionCleanupSchedulerOptions,
  ) {}

  start(): void {
    if (this.timer) {
      return;
    }

    this.timer = setInterval(() => {
      void this.runCleanup();
    }, this.options.intervalMs);
    this.timer.unref?.();
    this.logger.info({ intervalMs: this.options.intervalMs }, 'Session cleanup scheduler started');
  }

  stop(): void {
    if (!this.timer) {
      return;
    }

    clearInterval(this.timer);
    this.timer = undefined;
    this.logger.info('Session cleanup scheduler stopped');
  }

  private async runCleanup(): Promise<void> {
    try {
      await this.cleanup.cleanupExpiredSessions();
    } catch (error) {
      this.logger.error({ error }, 'Session cleanup failed');
    }
  }
}
