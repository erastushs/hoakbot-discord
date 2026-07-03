export interface LoggingNicknameUpdatedEvent {
  guildId: string;
  userId: string;
  before: string | null;
  after: string | null;
}

export interface LoggingMessageDeletedEvent {
  guildId: string;
  channelId: string;
  messageId: string;
  authorId: string;
  attachmentCount: number;
}

export interface LoggingMessageEditedEvent {
  guildId: string;
  channelId: string;
  messageId: string;
  authorId: string;
}

export interface LoggingMessageBulkDeletedEvent {
  guildId: string;
  channelId: string;
  count: number;
  moderatorId: string | null;
}

export interface LoggingAttachmentsArchivedEvent {
  guildId: string;
  channelId: string;
  messageId: string;
  archived: number;
  failed: number;
  skipped: number;
}

export interface LoggingKickLoggedEvent {
  guildId: string;
  moderatorId: string;
  targetId: string;
  reason: string;
}

export interface LoggingRoleAddedEvent {
  guildId: string;
  userId: string;
  roles: string[];
}

export interface LoggingRoleRemovedEvent {
  guildId: string;
  userId: string;
  roles: string[];
}

export interface LoggingDisplayNameUpdatedEvent {
  guildId: string;
  userId: string;
  before: string;
  after: string;
}

export interface LoggingAvatarUpdatedEvent {
  guildId: string;
  userId: string;
}

export interface LoggingModerationLoggedEvent {
  guildId: string;
  action: string;
  moderatorId: string;
  targetId: string;
}

export interface LoggingEventMap {
  'logging.member.nickname_updated': LoggingNicknameUpdatedEvent;
  'logging.member.role_added': LoggingRoleAddedEvent;
  'logging.member.role_removed': LoggingRoleRemovedEvent;
  'logging.member.display_name_updated': LoggingDisplayNameUpdatedEvent;
  'logging.member.avatar_updated': LoggingAvatarUpdatedEvent;
  'logging.message.deleted': LoggingMessageDeletedEvent;
  'logging.message.edited': LoggingMessageEditedEvent;
  'logging.message.bulk_deleted': LoggingMessageBulkDeletedEvent;
  'logging.message.attachments_archived': LoggingAttachmentsArchivedEvent;
  'logging.moderation.kick_logged': LoggingKickLoggedEvent;
  'logging.moderation.logged': LoggingModerationLoggedEvent;
}
