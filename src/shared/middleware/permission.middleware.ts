import type { ICommand, CommandContext } from '../types/command.js';
import type { ILogger } from '../../core/logger/logger.service.js';
import type { IEventBus } from '../../core/event-bus/types.js';
import type { IMetrics } from '../../core/metrics/types.js';
import type { AppConfig } from '../../core/config/types.js';

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

  async check(command: ICommand, ctx: CommandContext): Promise<PermissionResult> {
    const isOwner = this.config.ownerIds.includes(ctx.user.id);
    if (isOwner) {
      return { ok: true };
    }

    if (command.guildOnly && !ctx.guild) {
      await ctx.reply('This command can only be used inside a server.');

      this.emitDenied(ctx, command.name, 'guildOnly');
      return { ok: false, reason: 'guildOnly' };
    }

    const required = command.requiredPermissions;
    if (required && required.length > 0) {
      if (!ctx.member) {
        await ctx.reply('Could not resolve your guild member.');

        this.emitDenied(ctx, command.name, 'no-member');
        return { ok: false, reason: 'no-member' };
      }

      const userPermissions = ctx.member.permissions;
      if (typeof userPermissions === 'string') {
        await ctx.reply('You do not have permission to use this command.');

        this.emitDenied(ctx, command.name, 'permissions-unresolved');
        return { ok: false, reason: 'permissions-unresolved' };
      }

      for (const perm of required) {
        if (!userPermissions.has(perm)) {
          await ctx.reply('You do not have permission to use this command.');

          this.emitDenied(ctx, command.name, `missing:${String(perm)}`);
          return { ok: false, reason: 'user-permission' };
        }
      }

      if (ctx.guild) {
        const botMember = ctx.guild.members.me;
        if (!botMember) {
          await ctx.reply('I do not have the required permissions to perform this action.');

          this.emitDenied(ctx, command.name, 'bot-no-member');
          return { ok: false, reason: 'bot-no-member' };
        }

        const botPermissions = botMember.permissions;
        if (typeof botPermissions === 'string') {
          await ctx.reply('I do not have the required permissions to perform this action.');

          this.emitDenied(ctx, command.name, 'bot-permissions-unresolved');
          return { ok: false, reason: 'bot-permissions-unresolved' };
        }

        for (const perm of required) {
          if (!botPermissions.has(perm)) {
            await ctx.reply('I do not have the required permissions to perform this action.');

            this.emitDenied(ctx, command.name, `bot-missing:${String(perm)}`);
            return { ok: false, reason: 'bot-permission' };
          }
        }
      }
    }

    return { ok: true };
  }

  private emitDenied(ctx: CommandContext, command: string, reason: string): void {
    this.metrics.counter('permission_denied').increment();

    this.eventBus.emit('permission.denied', {
      userId: ctx.user.id,
      command,
      reason,
    });
  }
}
