import type { ICommand, CommandContext } from '../types/command.js';
import type { ILogger } from '../../core/logger/logger.service.js';
import type { IEventBus } from '../../core/event-bus/types.js';
import type { IMetrics } from '../../core/metrics/types.js';
import type { AppConfig } from '../../core/config/types.js';
import { Errors } from '../errors/errors.js';
import type { CommandMetadata } from '../command/define-command.js';
import { evaluateCommandAuthorization } from '../command/authorize-command.js';

export interface PermissionResult {
  ok: boolean;
  reason?: string;
}

export class PermissionMiddleware {
  constructor(
    private readonly config: Readonly<AppConfig>,
    private readonly logger: ILogger,
    private readonly eventBus: IEventBus,
    private readonly metrics: IMetrics,
  ) {}

  async check(command: ICommand, ctx: CommandContext, metadata?: CommandMetadata): Promise<PermissionResult> {
    const resolved = metadata ?? {
      owner: 'legacy', name: command.name, description: command.description, category: command.category,
      aliases: command.prefixAliases ?? [], scope: 'guild', permissionAction: `legacy.${command.name}`,
      requiredPermissions: (command.requiredPermissions ?? []).map(String), visibility: command.hidden ? 'hidden' : 'public',
      autocompleteOptions: [], payload: null,
    } satisfies CommandMetadata;
    const authorization = evaluateCommandAuthorization(resolved, command, ctx, this.config.ownerIds);
    if (authorization.ok) return authorization;

    if (authorization.reason === 'guildOnly') {
      await ctx.reply(Errors.guildOnly());

      this.emitDenied(ctx, command.name, 'guildOnly');
      return { ok: false, reason: 'guildOnly' };
    }

    const required = command.requiredPermissions;
    if (required && required.length > 0) {
      if (!ctx.member) {
        await ctx.reply(Errors.couldNotResolveMember());

        this.emitDenied(ctx, command.name, 'no-member');
        return { ok: false, reason: 'no-member' };
      }

      const userPermissions = ctx.member.permissions;
      if (typeof userPermissions === 'string') {
        await ctx.reply(Errors.permissionDenied());

        this.emitDenied(ctx, command.name, 'permissions-unresolved');
        return { ok: false, reason: 'permissions-unresolved' };
      }

      for (const perm of required) {
        if (!userPermissions.has(perm)) {
          await ctx.reply(Errors.permissionDenied());

          this.emitDenied(ctx, command.name, `missing:${String(perm)}`);
          return { ok: false, reason: 'user-permission' };
        }
      }

      if (ctx.guild) {
        const botMember = ctx.guild.members.me;
        if (!botMember) {
          await ctx.reply(Errors.botPermissionDenied());

          this.emitDenied(ctx, command.name, 'bot-no-member');
          return { ok: false, reason: 'bot-no-member' };
        }

        const botPermissions = botMember.permissions;
        if (typeof botPermissions === 'string') {
          await ctx.reply(Errors.botPermissionDenied());

          this.emitDenied(ctx, command.name, 'bot-permissions-unresolved');
          return { ok: false, reason: 'bot-permissions-unresolved' };
        }

        for (const perm of required) {
          if (!botPermissions.has(perm)) {
            await ctx.reply(Errors.botPermissionDenied());

            this.emitDenied(ctx, command.name, `bot-missing:${String(perm)}`);
            return { ok: false, reason: 'bot-permission' };
          }
        }
      }
    }

    return { ok: true };
  }

  private emitDenied(ctx: CommandContext, command: string, reason: string): void {
    this.metrics.counter('permission_denied_total').increment();

    this.eventBus.emit('permission.denied', {
      userId: ctx.user.id,
      command,
      reason,
    });
  }
}
