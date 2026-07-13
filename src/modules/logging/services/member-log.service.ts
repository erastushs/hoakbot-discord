import type { Client, GuildMember, PartialGuildMember, TextChannel, EmbedBuilder, Role, Guild } from 'discord.js';
import { Events } from 'discord.js';
import type { ILogger } from '../../../core/logger/logger.service.js';
import type { IMetrics } from '../../../core/metrics/types.js';
import type { MemberLogConfig } from '../../../core/config/types.js';
import type { IEventBus } from '../../../core/event-bus/types.js';
import { EmbedFactory } from '../../../shared/builders/embed.factory.js';
import { COLORS } from '../../../shared/constants/colors.js';

export class MemberLogService {
  private active = false;
  private readonly listener = (oldMember: GuildMember | PartialGuildMember, newMember: GuildMember) => {
    if (this.active) void this.handleMemberUpdate(oldMember as GuildMember, newMember);
  };

  constructor(
    private readonly client: Client,
    private readonly config: MemberLogConfig,
    private readonly logger: ILogger,
    private readonly metrics: IMetrics,
    private readonly eventBus: IEventBus,
  ) {}

  activate(): void { this.active = true; }
  handleDiscordMemberUpdate(oldMember: GuildMember | PartialGuildMember, newMember: GuildMember): void { if (this.active) void this.handleMemberUpdate(oldMember as GuildMember, newMember); }

  register(): void {
    if (this.active) return;
    this.active = true;
    this.client.on(Events.GuildMemberUpdate, this.listener);
  }

  dispose(): void {
    this.active = false;
    this.client.off(Events.GuildMemberUpdate, this.listener);
  }

  async handleMemberUpdate(oldMember: GuildMember, newMember: GuildMember): Promise<void> {
    if (!this.config.enabled) return;
    if (newMember.user.bot) return;

    if (this.config.roles) {
      await this.handleRoleChanges(oldMember, newMember);
    }

    await this.handleNicknameChange(oldMember, newMember);
    await this.handleDisplayNameChange(oldMember, newMember);
    await this.handleAvatarChange(oldMember, newMember);
  }

  private resolveChannel(guild: Guild): TextChannel | undefined {
    const channelId = this.config.channelId;
    if (!channelId) {
      this.logger.warn('Member log channelId not configured');
      return undefined;
    }

    const channel = guild.channels.cache.get(channelId) as TextChannel | undefined;
    if (!channel) {
      this.logger.warn({ channelId, guildId: guild.id }, 'Member log channel not found');
      return undefined;
    }

    return channel;
  }

  private async handleNicknameChange(oldMember: GuildMember, newMember: GuildMember): Promise<void> {
    const oldNick = oldMember.nickname ?? null;
    const newNick = newMember.nickname ?? null;

    if (oldNick === newNick) return;

    const channel = this.resolveChannel(newMember.guild);
    if (!channel) return;

    const embed = this.buildNicknameEmbed(newMember, oldNick, newNick);

    try {
      await channel.send({ embeds: [embed] });
      this.metrics.counter('member_log_total').increment();
      this.logger.info(
        { userId: newMember.id, guildId: newMember.guild.id, before: oldNick, after: newNick },
        'Nickname change log sent',
      );
      this.eventBus.emit('logging.member.nickname_updated', {
        guildId: newMember.guild.id,
        userId: newMember.id,
        before: oldNick,
        after: newNick,
      });
    } catch (err) {
      this.logger.error({ error: err, channelId: this.config.channelId }, 'Failed to send member log');
    }
  }

  private async handleRoleChanges(oldMember: GuildMember, newMember: GuildMember): Promise<void> {
    const oldRoles = [...oldMember.roles.cache.values()].filter(
      (r) => r.id !== oldMember.guild.id && !r.managed,
    );
    const newRoles = [...newMember.roles.cache.values()].filter(
      (r) => r.id !== newMember.guild.id && !r.managed,
    );

    const oldRoleIds = new Set(oldRoles.map((r) => r.id));
    const newRoleIds = new Set(newRoles.map((r) => r.id));

    const addedRoles = newRoles.filter((r) => !oldRoleIds.has(r.id));
    const removedRoles = oldRoles.filter((r) => !newRoleIds.has(r.id));

    if (addedRoles.length === 0 && removedRoles.length === 0) return;

    const channel = this.resolveChannel(newMember.guild);
    if (!channel) return;

    const guildId = newMember.guild.id;
    const userId = newMember.id;

    if (addedRoles.length > 0) {
      const embed = this.buildRoleEmbed(newMember, addedRoles, 'added');
      try {
        await channel.send({ embeds: [embed] });
        this.metrics.counter('member_role_added_total').increment();
        this.eventBus.emit('logging.member.role_added', {
          guildId,
          userId,
          roles: addedRoles.map((r) => r.id),
        });
      } catch (err) {
        this.logger.error({ error: err, channelId: this.config.channelId }, 'Failed to send role added log');
      }
    }

    if (removedRoles.length > 0) {
      const embed = this.buildRoleEmbed(newMember, removedRoles, 'removed');
      try {
        await channel.send({ embeds: [embed] });
        this.metrics.counter('member_role_removed_total').increment();
        this.eventBus.emit('logging.member.role_removed', {
          guildId,
          userId,
          roles: removedRoles.map((r) => r.id),
        });
      } catch (err) {
        this.logger.error({ error: err, channelId: this.config.channelId }, 'Failed to send role removed log');
      }
    }

    this.logger.info(
      {
        guildId,
        userId,
        addedRoles: addedRoles.map((r) => r.id),
        removedRoles: removedRoles.map((r) => r.id),
      },
      'Role change log sent',
    );
  }

  private async handleDisplayNameChange(oldMember: GuildMember, newMember: GuildMember): Promise<void> {
    const oldName = oldMember.displayName;
    const newName = newMember.displayName;

    if (oldName === newName) return;

    const channel = this.resolveChannel(newMember.guild);
    if (!channel) return;

    const embed = EmbedFactory.build({
      title: '\uD83C\uDFF7 Display Name Updated',
      description: `<@${newMember.id}> changed their display name.`,
      color: COLORS.PRIMARY,
      fields: [
        { name: 'Member', value: `<@${newMember.id}>`, inline: true },
        { name: 'Before', value: oldName, inline: true },
        { name: 'After', value: newName, inline: true },
      ],
      footer: 'Display Name',
    });

    try {
      await channel.send({ embeds: [embed] });
      this.metrics.counter('member_display_name_log_total').increment();
      this.logger.info(
        { userId: newMember.id, guildId: newMember.guild.id, before: oldName, after: newName },
        'Display name change log sent',
      );
      this.eventBus.emit('logging.member.display_name_updated', {
        guildId: newMember.guild.id,
        userId: newMember.id,
        before: oldName,
        after: newName,
      });
    } catch (err) {
      this.logger.error({ error: err, channelId: this.config.channelId }, 'Failed to send display name log');
    }
  }

  private async handleAvatarChange(oldMember: GuildMember, newMember: GuildMember): Promise<void> {
    const oldAvatar = oldMember.displayAvatarURL();
    const newAvatar = newMember.displayAvatarURL();

    if (oldAvatar === newAvatar) return;

    const channel = this.resolveChannel(newMember.guild);
    if (!channel) return;

    const embed = EmbedFactory.build({
      title: '\uD83D\uDDBC Avatar Updated',
      description: `<@${newMember.id}> updated their avatar.`,
      color: COLORS.PRIMARY,
      footer: 'Avatar Updated',
      thumbnail: oldAvatar || undefined,
      image: newAvatar,
    });

    try {
      await channel.send({ embeds: [embed] });
      this.metrics.counter('member_avatar_log_total').increment();
      this.logger.info(
        { userId: newMember.id, guildId: newMember.guild.id },
        'Avatar update log sent',
      );
      this.eventBus.emit('logging.member.avatar_updated', {
        guildId: newMember.guild.id,
        userId: newMember.id,
      });
    } catch (err) {
      this.logger.error({ error: err, channelId: this.config.channelId }, 'Failed to send avatar log');
    }
  }

  private buildNicknameEmbed(member: GuildMember, oldNick: string | null, newNick: string | null): EmbedBuilder {
    return EmbedFactory.build({
      title: '\uD83C\uDFF7 Nickname Updated',
      color: COLORS.PRIMARY,
      fields: [
        { name: 'Member', value: `<@${member.id}>`, inline: true },
        { name: 'User ID', value: `\`${member.id}\``, inline: true },
        { name: 'Before', value: oldNick ?? '*None*', inline: true },
        { name: 'After', value: newNick ?? '*None*', inline: true },
      ],
      footer: 'Nickname Updated',
    });
  }

  private buildRoleEmbed(member: GuildMember, roles: Role[], type: 'added' | 'removed'): EmbedBuilder {
    const isAdded = type === 'added';
    return EmbedFactory.build({
      title: isAdded ? '➕ Role Added' : '➖ Role Removed',
      description: isAdded ? `<@${member.id}> received role(s).` : `<@${member.id}> lost role(s).`,
      color: isAdded ? COLORS.SUCCESS : COLORS.ERROR,
      fields: [
        { name: 'Member', value: `<@${member.id}>`, inline: true },
        { name: 'Role(s)', value: roles.map((r) => `<@&${r.id}>`).join('\n'), inline: true },
        { name: 'Moderator', value: 'Unknown', inline: true },
      ],
      footer: isAdded ? 'Role Added' : 'Role Removed',
    });
  }
}
