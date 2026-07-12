import { z } from 'zod';

import type { ILogger } from '../../../core/logger/logger.service.js';
import { serializeError } from '../../../shared/utils/error.js';
import type { ShrineClientOptions, ShrineRotation, ShrineUsageTier } from '../types.js';

const usageTiers = ['veryhigh', 'high', 'medium', 'low'] as const;

const usageTierSchema = z.string().transform((value): ShrineUsageTier => {
  return usageTiers.includes(value as (typeof usageTiers)[number]) ? value as ShrineUsageTier : 'unknown';
});

const shrineResponseSchema = z.object({
  start: z.string().datetime({ offset: true }).or(z.string()),
  end: z.string().datetime({ offset: true }).or(z.string()),
  week: z.number().int().nonnegative(),
  perks: z.array(z.object({
    id: z.number().int(),
    bloodpoints: z.number().int().nonnegative(),
    shards: z.number().int().nonnegative(),
    name: z.string().min(1),
    image: z.string().min(1),
    character: z.string().min(1),
    usage_tier: usageTierSchema,
  })).min(1),
});

const nightLightResponseSchema = z.object({
  status: z.literal('success'),
  error: z.unknown().nullable(),
  data: shrineResponseSchema,
});

export class ShrineClient {
  constructor(
    private readonly options: ShrineClientOptions,
    private readonly logger: Pick<ILogger, 'debug' | 'warn'>,
  ) {}

  async fetchShrine(signal?: AbortSignal): Promise<ShrineRotation> {
    const url = new URL('shrine', this.normalizedBaseUrl()).toString();
    let lastError: unknown;

    for (let attempt = 1; attempt <= this.options.retries + 1; attempt += 1) {
      const controller = new AbortController();
      const abort = () => controller.abort(signal?.reason);
      signal?.addEventListener('abort', abort, { once: true });
      const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs);
      timeout.unref?.();

      try {
        signal?.throwIfAborted();
        this.logger.debug({ url, attempt }, 'Fetching Shrine from NightLight');
        const response = await fetch(url, { signal: controller.signal });

        if (!response.ok) {
          throw new Error(`NightLight Shrine request failed with ${response.status}`);
        }

        const raw = await response.json() as unknown;
        this.logger.debug({ status: response.status, raw }, 'NightLight Shrine raw response');
        return this.parse(raw);
      } catch (error) {
        lastError = error;
        if (signal?.aborted) throw signal.reason ?? error;

        if (attempt > this.options.retries) {
          break;
        }

        this.logger.warn(
          { error: serializeError(error), attempt, nextAttempt: attempt + 1 },
          'NightLight Shrine request failed; retrying',
        );
        await this.delay(this.options.retryDelayMs, signal);
      } finally {
        clearTimeout(timeout);
        signal?.removeEventListener('abort', abort);
      }
    }

    throw lastError instanceof Error ? lastError : new Error('NightLight Shrine request failed');
  }

  private parse(raw: unknown): ShrineRotation {
    const parsed = nightLightResponseSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(`Invalid NightLight Shrine response: ${parsed.error.message}`);
    }

    const shrine = parsed.data.data;
    const start = new Date(shrine.start);
    const end = new Date(shrine.end);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new Error('Invalid NightLight Shrine response: invalid start or end timestamp');
    }

    return {
      week: shrine.week,
      start,
      end,
      perks: shrine.perks.map((perk) => ({
        id: perk.id,
        name: perk.name,
        character: perk.character,
        shards: perk.shards,
        bloodpoints: perk.bloodpoints,
        image: perk.image,
        usageTier: perk.usage_tier as ShrineUsageTier,
      })),
    };
  }

  private normalizedBaseUrl(): string {
    return this.options.baseUrl.endsWith('/') ? this.options.baseUrl : `${this.options.baseUrl}/`;
  }

  private async delay(ms: number, signal?: AbortSignal): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const cleanup = () => signal?.removeEventListener('abort', abort);
      const timer = setTimeout(() => { cleanup(); resolve(); }, ms);
      const abort = () => { clearTimeout(timer); cleanup(); reject(signal?.reason ?? new Error('Shrine request aborted')); };
      signal?.addEventListener('abort', abort, { once: true });
      if (signal?.aborted) abort();
    });
  }
}
