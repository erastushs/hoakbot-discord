import type { ILogger } from '../logger/logger.service.js';
import type { ISettingMetadata } from '../settings/types.js';
import type { APIHttpMethod, APIRequest } from './types.js';

export type SecurityAuditEventName =
  | 'successful_login'
  | 'failed_login'
  | 'logout'
  | 'session_expired'
  | 'session_revoked'
  | 'csrf_validation_failure'
  | 'authorization_denied'
  | 'authentication_required'
  | 'rate_limit_exceeded'
  | 'configuration_changed'
  | 'configuration_change_denied'
  | 'unknown_guild_access_attempt';

export interface SecurityAuditContext {
  readonly userId?: string;
  readonly guildId?: string;
  readonly ip?: string;
  readonly path?: string;
  readonly method?: APIHttpMethod;
  readonly result: 'success' | 'failure' | 'denied' | 'limited';
  readonly reason?: string;
}

export interface SecurityAuditConfigChange {
  readonly guildId: string;
  readonly module: string;
  readonly key: string;
  readonly oldValue: unknown;
  readonly newValue: unknown;
  readonly userId?: string;
  readonly metadata?: ISettingMetadata;
}

export interface SecurityAuditServiceOptions {
  readonly now?: () => Date;
}

const MASKED_VALUE = '********';

export class SecurityAuditService {
  private readonly now: () => Date;

  constructor(
    private readonly logger: Pick<ILogger, 'info' | 'warn'>,
    options: SecurityAuditServiceOptions = {},
  ) {
    this.now = options.now ?? (() => new Date());
  }

  record(event: SecurityAuditEventName, context: SecurityAuditContext): void {
    const entry = this.baseEntry(event, context);
    const level = context.result === 'success' ? 'info' : 'warn';
    this.logger[level](entry, 'Security audit event');
  }

  recordConfigurationChange(change: SecurityAuditConfigChange, request?: APIRequest): void {
    const context = contextFromRequest(request, {
      userId: change.userId,
      guildId: change.guildId,
      result: 'success',
    });

    this.logger.info({
      ...this.baseEntry('configuration_changed', context),
      module: change.module,
      settingKey: change.key,
      oldValue: this.maskValue(change.oldValue, change.metadata),
      newValue: this.maskValue(change.newValue, change.metadata),
    }, 'Security audit event');
  }

  maskValue(value: unknown, metadata?: Pick<ISettingMetadata, 'secret'>): unknown {
    return metadata?.secret ? MASKED_VALUE : value;
  }

  private baseEntry(event: SecurityAuditEventName, context: SecurityAuditContext): Record<string, unknown> {
    return withoutUndefined({
      timestamp: this.now().toISOString(),
      event,
      userId: context.userId,
      guildId: context.guildId,
      ip: context.ip,
      path: context.path,
      method: context.method,
      result: context.result,
      reason: context.reason,
    });
  }
}

export function contextFromRequest(
  request: APIRequest | undefined,
  context: Omit<SecurityAuditContext, 'ip' | 'path' | 'method'>,
): SecurityAuditContext {
  return {
    ...context,
    ip: request?.ip,
    path: request?.path,
    method: request?.method,
  };
}

function withoutUndefined(entry: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(entry).filter(([, value]) => value !== undefined));
}
