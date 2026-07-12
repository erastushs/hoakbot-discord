import type { Client, Message, PartialMessage, TextChannel, EmbedBuilder, Guild } from 'discord.js';
import { Events, AuditLogEvent } from 'discord.js';
import type { ILogger } from '../../../core/logger/logger.service.js';
import type { IMetrics } from '../../../core/metrics/types.js';
import type { MessageLogConfig } from '../../../core/config/types.js';
import type { IEventBus } from '../../../core/event-bus/types.js';
import { EmbedFactory } from '../../../shared/builders/embed.factory.js';
import { AttachmentArchiveService } from '../../../shared/attachment/attachment-archive.service.js';
import { COLORS } from '../../../shared/constants/colors.js';
import { discordLogContent } from '../../../shared/builders/discord-content.js';
const DELETE_FOOTER = 'Message Delete';

interface BulkMessageCollection {
  readonly size: number;
  first(): Message | PartialMessage | undefined;
  keys(): IterableIterator<string>;
}

export class MessageLogService {
  constructor(
    private readonly client: Client,
    private readonly config: MessageLogConfig,
    private readonly logger: ILogger,
    private readonly metrics: IMetrics,
    private readonly eventBus: IEventBus,
  ) {}

  register(): void {
    this.client.on(Events.MessageDelete, (message: Message | PartialMessage) => {
      void this.handleMessageDelete(message);
    });

    this.client.on(Events.MessageUpdate, (oldMessage: Message | PartialMessage, newMessage: Message | PartialMessage) => {
      void this.handleMessageEdit(oldMessage, newMessage);
    });

    this.client.on(Events.MessageBulkDelete, (messages, _channel) => {
      void this.handleMessageBulkDelete(messages as unknown as BulkMessageCollection);
    });
  }

  async handleMessageDelete(message: Message | PartialMessage): Promise<void> {
    if (!this.config.enabled) return;
    if (!message.guildId) return;
    if (message.author?.bot) return;
    if (message.system) return;

    const channelId = this.config.channelId;
    if (!channelId) {
      this.logger.warn('Message log channelId not configured');
      return;
    }

    const guild = this.client.guilds.cache.get(message.guildId);
    if (!guild) {
      this.logger.warn({ guildId: message.guildId }, 'Guild not found for message log');
      return;
    }

    const logChannel = guild.channels.cache.get(channelId) as TextChannel | undefined;
    if (!logChannel) {
      this.logger.warn({ channelId, guildId: guild.id }, 'Message log channel not found');
      return;
    }

    const content = message.content ?? '';

    const archiveResult = await this.archiveAttachments(message);

    const embed = this.buildDeleteEmbed(message, content, archiveResult);

    const logPayload: Record<string, unknown> = { embeds: [embed] };
    if (archiveResult.files.length > 0) {
      logPayload.files = archiveResult.files;
    }

    try {
      const msg = await logChannel.send(logPayload);
      void msg;
      this.metrics.counter('message_log_total').increment();

      this.logger.info(
        {
          guildId: message.guildId,
          channelId: message.channelId,
          messageId: message.id,
          authorId: message.author?.id ?? null,
          attachments: archiveResult.total,
          archived: archiveResult.archivedCount,
          failed: archiveResult.failedCount,
          skipped: archiveResult.skippedCount,
        },
        'Message delete log sent',
      );

      this.eventBus.emit('logging.message.deleted', {
        guildId: message.guildId,
        channelId: message.channelId,
        messageId: message.id,
        authorId: message.author?.id ?? '',
        attachmentCount: archiveResult.total,
      });

      this.eventBus.emit('logging.message.attachments_archived', {
        guildId: message.guildId,
        channelId: message.channelId,
        messageId: message.id,
        archived: archiveResult.archivedCount,
        failed: archiveResult.failedCount,
        skipped: archiveResult.skippedCount,
      });
    } catch (err) {
      this.logger.error({ error: err, channelId }, 'Failed to send message log');
    }
  }

  private async archiveAttachments(
    message: Message | PartialMessage,
  ): Promise<{
    files: Array<Record<string, unknown>>;
    archivedCount: number;
    failedCount: number;
    skippedCount: number;
    total: number;
    archiveLabel: string | null;
    firstImageFileName: string | null;
  }> {
    const attachments = message.attachments;
    if (!attachments || attachments.size === 0) {
      return { files: [], archivedCount: 0, failedCount: 0, skippedCount: 0, total: 0, archiveLabel: null, firstImageFileName: null };
    }

    if (!this.config.archiveAttachments) {
      const names = [...attachments.values()].map((a) => a.name);
      const label = attachments.size === 1 ? names[0]! : `${attachments.size} attachments`;
      return { files: [], archivedCount: 0, failedCount: 0, skippedCount: 0, total: attachments.size, archiveLabel: label, firstImageFileName: null };
    }

    const service = new AttachmentArchiveService();
    const maxBytes = AttachmentArchiveService.maxSizeBytes(this.config.maxAttachmentSizeMb);

    const attachmentMap = new Map<string, { url: string; name: string; size: number }>();
    for (const [, a] of attachments) {
      attachmentMap.set(a.id, { url: a.url, name: a.name, size: a.size });
    }

    const result = await service.archive(attachmentMap, { maxSizeBytes: maxBytes });

    this.metrics.counter('message_attachment_archived_total').increment(result.archivedCount);
    this.metrics.counter('message_attachment_failed_total').increment(result.failedCount);
    this.metrics.counter('message_attachment_skipped_total').increment(result.skippedCount);

    const parts: string[] = [];
    if (result.archivedCount > 0) parts.push(`Archived: ${result.archivedCount}`);
    if (result.skippedCount > 0) parts.push(`Skipped: ${result.skippedCount}`);
    if (result.failedCount > 0) parts.push(`Failed: ${result.failedCount}`);

    return {
      files: result.files.map((f) => f as unknown as Record<string, unknown>),
      archivedCount: result.archivedCount,
      failedCount: result.failedCount,
      skippedCount: result.skippedCount,
      total: attachments.size,
      archiveLabel: parts.length > 0 ? parts.join('\n') : null,
      firstImageFileName: result.firstImageFileName,
    };
  }

  async handleMessageEdit(
    oldMessage: Message | PartialMessage,
    newMessage: Message | PartialMessage,
  ): Promise<void> {
    if (!this.config.enabled) return;
    if (!newMessage.guildId) return;
    if (newMessage.author?.bot) return;
    if (newMessage.system) return;
    if (oldMessage.partial) return;

    const oldContent = (oldMessage as Message).content ?? '';
    const newContent = newMessage.content ?? '';
    if (oldContent === newContent) return;

    const channelId = this.config.channelId;
    if (!channelId) {
      this.logger.warn('Message log channelId not configured');
      return;
    }

    const guild = this.client.guilds.cache.get(newMessage.guildId);
    if (!guild) {
      this.logger.warn({ guildId: newMessage.guildId }, 'Guild not found for message edit log');
      return;
    }

    const channel = guild.channels.cache.get(channelId) as TextChannel | undefined;
    if (!channel) {
      this.logger.warn({ channelId, guildId: guild.id }, 'Message edit log channel not found');
      return;
    }

    const embed = this.buildEditEmbed(newMessage, oldContent, newContent);

    try {
      await channel.send({ embeds: [embed] });
      this.metrics.counter('message_edit_log_total').increment();
      this.logger.info(
        {
          guildId: newMessage.guildId,
          channelId: newMessage.channelId,
          messageId: newMessage.id,
          authorId: newMessage.author?.id ?? null,
        },
        'Message edit log sent',
      );
      this.eventBus.emit('logging.message.edited', {
        guildId: newMessage.guildId,
        channelId: newMessage.channelId,
        messageId: newMessage.id,
        authorId: newMessage.author?.id ?? '',
      });
    } catch (err) {
      this.logger.error({ error: err, channelId }, 'Failed to send message edit log');
    }
  }

  async handleMessageBulkDelete(
    messages: BulkMessageCollection,
  ): Promise<void> {
    if (!this.config.enabled) return;
    if (messages.size === 0) return;

    const first = messages.first();
    if (!first?.guildId) return;

    const channelId = this.config.channelId;
    if (!channelId) {
      this.logger.warn('Message log channelId not configured');
      return;
    }

    const guild = this.client.guilds.cache.get(first.guildId);
    if (!guild) {
      this.logger.warn({ guildId: first.guildId }, 'Guild not found for bulk delete log');
      return;
    }

    const logChannel = guild.channels.cache.get(channelId) as TextChannel | undefined;
    if (!logChannel) {
      this.logger.warn({ channelId, guildId: guild.id }, 'Bulk delete log channel not found');
      return;
    }

    const moderatorId = await this.resolveBulkDeleteModerator(guild, first.channelId, messages.size);

    const embed = this.buildBulkDeleteEmbed(moderatorId, first.channelId, messages.size);

    try {
      await logChannel.send({ embeds: [embed] });
      this.metrics.counter('message_bulk_delete_log_total').increment();
      this.logger.info(
        {
          guildId: first.guildId,
          channelId: first.channelId,
          deletedCount: messages.size,
          moderatorId,
        },
        'Bulk message delete log sent',
      );
      this.eventBus.emit('logging.message.bulk_deleted', {
        guildId: first.guildId,
        channelId: first.channelId,
        count: messages.size,
        moderatorId,
      });
    } catch (err) {
      this.logger.error({ error: err, channelId }, 'Failed to send bulk delete log');
    }
  }

  private async resolveBulkDeleteModerator(
    guild: Guild,
    targetChannelId: string,
    count: number,
  ): Promise<string | null> {
    const TOLERANCE_MS = 10_000;

    try {
      await new Promise((resolve) => setTimeout(resolve, 750));
    } catch {
      // Ignore timeout errors
    }

    try {
      const logs = await guild.fetchAuditLogs({
        type: AuditLogEvent.MessageBulkDelete,
        limit: 5,
      });

      const now = Date.now();

      for (const [, entry] of logs.entries) {
        if (now - entry.createdTimestamp > TOLERANCE_MS) continue;

        const extra = entry.extra as { count: number };
        if (extra.count !== count) continue;

        const target = entry.target as { id: string } | null;
        if (target?.id !== targetChannelId) continue;

        return entry.executor?.id ?? null;
      }
    } catch (err) {
      this.logger.warn({ error: err }, 'Failed to fetch audit logs for bulk delete');
    }

    return null;
  }

  private buildBulkDeleteEmbed(
    moderatorId: string | null,
    channelId: string,
    count: number,
  ): EmbedBuilder {
    const actor = moderatorId ? `<@${moderatorId}>` : 'Someone';
    const messagesWord = count === 1 ? '**1 message**' : `**${count} messages**`;

    return EmbedFactory.build({
      title: '\uD83D\uDDD1 Bulk Message Delete',
      color: COLORS.NEUTRAL,
      description: `${actor} deleted ${messagesWord} in <#${channelId}>.`,
      footer: 'Bulk Message Delete',
    });
  }

  private buildDeleteEmbed(
    message: Message | PartialMessage,
    content: string,
    archive: {
      archiveLabel: string | null;
      firstImageFileName: string | null;
    },
  ): EmbedBuilder {
    const fields = [
      {
        name: 'Author',
        value: message.author ? `<@${message.author.id}>` : '*Unknown*',
        inline: true,
      },
      {
        name: 'Channel',
        value: message.channelId ? `<#${message.channelId}>` : '*Unknown*',
        inline: true,
      },
      {
        name: 'Message ID',
        value: `\`${message.id}\``,
        inline: true,
      },
      {
        name: 'Content',
        value: this.formatContent(content),
        inline: false,
      },
    ];

    if (archive.archiveLabel) {
      fields.push({
        name: 'Attachments',
        value: archive.archiveLabel,
        inline: true,
      });
    }

    const image = archive.firstImageFileName ? `attachment://${archive.firstImageFileName}` : undefined;

    return EmbedFactory.build({
      title: '\uD83D\uDDD1 Message Deleted',
      color: COLORS.NEUTRAL,
      fields,
      footer: DELETE_FOOTER,
      image,
    });
  }

  private buildEditEmbed(
    message: Message | PartialMessage,
    oldContent: string,
    newContent: string,
  ): EmbedBuilder {
    const fields = [
      {
        name: 'Author',
        value: message.author ? `<@${message.author.id}>` : '*Unknown*',
        inline: true,
      },
      {
        name: 'Channel',
        value: message.channelId ? `<#${message.channelId}>` : '*Unknown*',
        inline: true,
      },
      {
        name: 'Message ID',
        value: `\`${message.id}\``,
        inline: true,
      },
      {
        name: 'Before',
        value: this.formatContent(oldContent),
        inline: false,
      },
      {
        name: 'After',
        value: this.formatContent(newContent),
        inline: false,
      },
    ];

    if (message.url) {
      fields.push({
        name: 'Jump',
        value: `[Open Message](${message.url})`,
        inline: false,
      });
    }

    return EmbedFactory.build({
      title: '\u270F\uFE0F Message Edited',
      color: COLORS.PRIMARY,
      fields,
      footer: 'Message Edit',
    });
  }

  private formatContent(content: string): string {
    if (!content) return '*(No content)*';

    return discordLogContent(content);
  }
}
