import type { CommandContext, ICommand } from '../types/command.js';
import type { CommandMetadata } from './define-command.js';

export interface AuthorizationResult {
  readonly ok: boolean;
  readonly reason?: string;
}

export function evaluateCommandAuthorization(
  metadata: CommandMetadata,
  _command: ICommand,
  ctx: CommandContext,
  ownerIds: readonly string[],
  checkBot = true,
): AuthorizationResult {
  const owner = ownerIds.includes(ctx.user.id);
  if (metadata.scope === 'guild' && !ctx.guild) return { ok: false, reason: 'guildOnly' };
  if (metadata.permissionAction === 'owner') return owner ? { ok: true } : { ok: false, reason: 'owner' };
  if (owner) return { ok: true };
  const required = metadata.requiredPermissions;
  if (!required.length) return { ok: true };
  if (!ctx.member) return { ok: false, reason: 'no-member' };
  if (typeof ctx.member.permissions === 'string') return { ok: false, reason: 'permissions-unresolved' };
  for (const permission of required)
    if (!ctx.member.permissions.has(BigInt(permission))) return { ok: false, reason: 'user-permission' };
  if (checkBot && ctx.guild) {
    const bot = ctx.guild.members?.me;
    if (!bot) return { ok: false, reason: 'bot-no-member' };
    if (typeof bot.permissions === 'string') return { ok: false, reason: 'bot-permissions-unresolved' };
    for (const permission of required)
      if (!bot.permissions.has(BigInt(permission))) return { ok: false, reason: 'bot-permission' };
  }
  return { ok: true };
}
