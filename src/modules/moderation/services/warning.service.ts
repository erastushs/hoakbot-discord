import type { ILogger } from '../../../core/logger/logger.service.js';
import type { IEventBus } from '../../../core/event-bus/types.js';
import type { IMetrics } from '../../../core/metrics/types.js';
import type { WarningRepository} from '../repositories/warning.repository.js';
import { type WarningRow } from '../repositories/warning.repository.js';

export interface WarnInput {
  guildId: string;
  userId: string;
  moderatorId: string;
  reason: string;
}

export class WarningService {
  constructor(
    private readonly repository: WarningRepository,
    private readonly logger: ILogger,
    private readonly eventBus: IEventBus,
    private readonly metrics: IMetrics,
  ) {}

  async warn(input: WarnInput): Promise<WarningRow> {
    const warning = await this.repository.createWarning({
      guildId: input.guildId,
      userId: input.userId,
      moderatorId: input.moderatorId,
      reason: input.reason,
    });

    const count = await this.repository.countWarnings(input.guildId, input.userId);

    this.metrics.counter('warnings_issued_total').increment();

    this.eventBus.emit('moderation.warningIssued', {
      guildId: input.guildId,
      moderatorId: input.moderatorId,
      targetId: input.userId,
      warningId: warning.id,
    });

    this.logger.info(
      {
        guildId: input.guildId,
        userId: input.userId,
        moderatorId: input.moderatorId,
        warningId: warning.id,
        count,
      },
      'Warning issued',
    );

    return warning;
  }

  async history(guildId: string, userId: string, limit = 50): Promise<WarningRow[]> {
    return this.repository.getWarnings(guildId, userId, limit);
  }

  async count(guildId: string, userId: string): Promise<number> {
    return this.repository.countWarnings(guildId, userId);
  }

  async remove(id: string): Promise<boolean> {
    const deleted = await this.repository.deleteWarning(id);

    if (deleted) {
      this.logger.info({ warningId: id }, 'Warning removed');
    }

    return deleted;
  }

  async clear(guildId: string, userId: string): Promise<number> {
    const count = await this.repository.clearWarnings(guildId, userId);

    if (count > 0) {
      this.logger.info({ guildId, userId, count }, 'Warnings cleared');
    }

    return count;
  }
}
