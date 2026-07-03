import type { Client, Message, PartialMessage, TextChannel, EmbedBuilder } from 'discord.js';
import { Events } from 'discord.js';
import type { ILogger } from '../../../core/logger/logger.service.js';
import type { IMetrics } from '../../../core/metrics/types.js';
import type { MessageLogConfig } from '../../../core/config/types.js';
import type { IEventBus } from '../../../core/event-bus/types.js';
import { EmbedFactory } from '../../../shared/builders/embed.factory.js';
import { COLORS } from '../../../shared/constants/colors.js';

const NEUTRAL_GRAY = 0x8d99ae;
const CONTENT_MAX = 1024;

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

    const channel = guild.channels.cache.get(channelId) as TextChannel | undefined;
    if (!channel) {
      this.logger.warn({ channelId, guildId: guild.id }, 'Message log channel not found');
      return;
    }

    const content = message.content ?? '';
    const attachmentCount = message.attachments?.size ?? 0;

    const embed = this.buildDeleteEmbed(message, content, attachmentCount);

    try {
      await channel.send({ embeds: [embed] });
      this.metrics.counter('message_log_total').increment();
      this.logger.info(
        {
          guildId: message.guildId,
          channelId: message.channelId,
          messageId: message.id,
          authorId: message.author?.id ?? null,
          attachments: attachmentCount,
        },
        'Message delete log sent',
      );
      this.eventBus.emit('logging.message.deleted', {
        guildId: message.guildId,
        channelId: message.channelId,
        messageId: message.id,
        authorId: message.author?.id ?? '',
        attachmentCount,
      });
    } catch (err) {
      this.logger.error({ error: err, channelId }, 'Failed to send message log');
    }
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

    const channel = guild.channels.cache.get(channelId) as TextChannel | undefined;
    if (!channel) {
      this.logger.warn({ channelId, guildId: guild.id }, 'Bulk delete log channel not found');
      return;
    }

    const embed = this.buildBulkDeleteEmbed(messages, first.channelId);

    try {
      await channel.send({ embeds: [embed] });
      this.metrics.counter('message_bulk_delete_log_total').increment();
      this.logger.info(
        {
          guildId: first.guildId,
          channelId: first.channelId,
          deletedCount: messages.size,
        },
        'Bulk message delete log sent',
      );
      this.eventBus.emit('logging.message.bulk_deleted', {
        guildId: first.guildId,
        channelId: first.channelId,
        count: messages.size,
      });
    } catch (err) {
      this.logger.error({ error: err, channelId }, 'Failed to send bulk delete log');
    }
  }

  private buildBulkDeleteEmbed(
    messages: BulkMessageCollection,
    channelId: string,
  ): EmbedBuilder {
    const ids = [...messages.keys()];

    const fields = [
      {
        name: 'Channel',
        value: `<#${channelId}>`,
        inline: true,
      },
      {
        name: 'Messages Deleted',
        value: String(messages.size),
        inline: true,
      },
    ];

    if (ids.length > 0) {
      fields.push({
        name: 'First Message ID',
        value: `\`${ids[0]}\``,
        inline: true,
      });
    }

    if (ids.length > 1) {
      fields.push({
        name: 'Oldest Message ID',
        value: `\`${ids[0]}\``,
        inline: true,
      });
      fields.push({
        name: 'Newest Message ID',
        value: `\`${ids[ids.length - 1]}\``,
        inline: true,
      });
    }

    return EmbedFactory.build({
      title: '\uD83D\uDDD1 Bulk Message Delete',
      color: NEUTRAL_GRAY,
      fields,
      footer: 'Bulk Message Delete',
    });
  }

  private buildDeleteEmbed(
    message: Message | PartialMessage,
    content: string,
    attachmentCount: number,
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

    if (attachmentCount > 0) {
      fields.push({
        name: 'Attachments',
        value:
          attachmentCount === 1
            ? (message.attachments?.first()?.name ?? '1 attachment')
            : `${attachmentCount} attachments`,
        inline: true,
      });
    }

    return EmbedFactory.build({
      title: '\uD83D\uDDD1 Message Deleted',
      color: NEUTRAL_GRAY,
      fields,
      footer: 'Message Delete',
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

    if (content.length > CONTENT_MAX) {
      return content.slice(0, CONTENT_MAX - 3) + '...';
    }

    return content;
  }
}
