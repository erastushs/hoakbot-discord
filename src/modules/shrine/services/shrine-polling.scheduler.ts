import type { ShrineConfig } from '../../../core/config/types.js';
import type { ILogger } from '../../../core/logger/logger.service.js';
import { serializeError } from '../../../shared/utils/error.js';
import type { ShrineService } from './shrine.service.js';

export class ShrinePollingScheduler {
  private timer: NodeJS.Timeout | undefined;
  private delayedUpdateStartedAt: number | null = null;
  private running = false;
  private stopped = true;
  private controller: AbortController | undefined;

  constructor(
    private readonly service: ShrineService,
    private readonly logger: Pick<ILogger, 'debug' | 'error' | 'info'>,
    private readonly config: ShrineConfig,
    private readonly now: () => number = () => Date.now(),
  ) {}

  start(): void {
    if (!this.stopped) return;
    this.stopped = false;

    if (!this.config.enabled) {
      this.logger.info('Shrine polling scheduler disabled');
      return;
    }

    this.logger.info({ polling: this.config.polling }, 'Shrine polling scheduler started');
    void this.runPoll();
  }

  stop(): void {
    if (this.stopped) return;
    this.stopped = true;
    this.controller?.abort();
    this.controller = undefined;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }

    this.logger.info('Shrine polling scheduler stopped');
  }

  private async runPoll(): Promise<void> {
    if (this.running) {
      return;
    }

    if (this.stopped) return;
    this.running = true;
    this.controller = new AbortController();
    let changed = false;

    try {
      const beforeWeek = this.service.nextResetTime()?.getTime() ?? null;
      await this.service.pollAndAnnounce(this.controller.signal);
      const afterWeek = this.service.nextResetTime()?.getTime() ?? null;
      changed = beforeWeek !== null && afterWeek !== null && afterWeek !== beforeWeek;
    } catch (error) {
      if (!this.stopped) this.logger.error({ error: serializeError(error) }, 'Shrine scheduled poll failed');
    } finally {
      this.running = false;
      this.controller = undefined;
      if (!this.stopped) this.scheduleNext(changed);
    }
  }

  private scheduleNext(changed: boolean): void {
    const delay = this.nextDelay(changed);
    this.timer = setTimeout(() => {
      this.timer = undefined;
      void this.runPoll();
    }, delay);
    this.timer.unref?.();
    this.logger.debug({ delayMs: delay }, 'Next Shrine poll scheduled');
  }

  private nextDelay(changed: boolean): number {
    if (changed) {
      this.delayedUpdateStartedAt = null;
    }

    const reset = this.service.nextResetTime();
    if (!reset) {
      return this.config.polling.pollIntervalMs;
    }

    const now = this.now();
    const resetAt = reset.getTime();
    const fastWindowStartsAt = resetAt - this.config.polling.preResetWindowMs;

    if (now < fastWindowStartsAt) {
      return Math.max(fastWindowStartsAt - now, this.config.polling.pollIntervalMs);
    }

    if (now <= resetAt) {
      return this.config.polling.pollIntervalMs;
    }

    this.delayedUpdateStartedAt ??= now;
    const delayedElapsed = now - this.delayedUpdateStartedAt;
    if (delayedElapsed <= this.config.polling.delayedUpdateWindowMs) {
      return this.config.polling.pollIntervalMs;
    }

    return this.config.polling.fallbackRetryMs;
  }
}
