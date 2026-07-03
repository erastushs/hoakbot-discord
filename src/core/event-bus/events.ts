export interface BotReadyEvent {
  guildCount: number;
  pingMs: number;
}

export interface BotErrorEvent {
  error: Error;
  source: string;
}

export interface CommandExecutedEvent {
  command: string;
  source: string;
  userId: string;
  guildId: string;
  latencyMs: number;
}

export interface CommandFailedEvent {
  command: string;
  source: string;
  userId: string;
  guildId: string;
  error: Error;
}

export interface MemberJoinedEvent {
  guildId: string;
  userId: string;
  memberCount: number;
}

export interface MemberLeftEvent {
  guildId: string;
  userId: string;
  memberCount: number;
}

export interface VoiceMemberJoinedEvent {
  guildId: string;
  userId: string;
  username: string;
  channelId: string;
  channelName: string;
  joinedAt: number;
}

export interface VoiceSoundPlayedEvent {
  guildId: string;
  channelId: string;
  soundId: string;
  soundName: string;
}

export interface VoiceConnectionLostEvent {
  guildId: string;
}

export interface VoiceConnectionRestoredEvent {
  guildId: string;
}

export interface ModerationActionEvent {
  guildId: string;
  moderatorId: string;
  targetId: string;
  action: string;
  reason: string;
}

export interface WarningIssuedEvent {
  guildId: string;
  moderatorId: string;
  targetId: string;
  warningId: string;
}

export interface CooldownBlockedEvent {
  userId: string;
  command: string;
  remainingMs: number;
}

export interface PermissionDeniedEvent {
  userId: string;
  command: string;
  reason: string;
  requiredLevel?: number;
  userLevel?: number;
}

export interface SchedulerJobDueEvent {
  jobId: string;
  jobType: string;
  guildId: string;
  payload: Record<string, unknown>;
}

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
}

export interface LoggingAttachmentsArchivedEvent {
  guildId: string;
  channelId: string;
  messageId: string;
  archived: number;
  failed: number;
  skipped: number;
}

export type ShutdownEvent = void;

export interface EventMap {
  'bot.ready': BotReadyEvent;
  'bot.error': BotErrorEvent;
  'command.executed': CommandExecutedEvent;
  'command.failed': CommandFailedEvent;
  'member.joined': MemberJoinedEvent;
  'member.left': MemberLeftEvent;
  'voice.memberJoined': VoiceMemberJoinedEvent;
  'voice.soundPlayed': VoiceSoundPlayedEvent;
  'voice.connectionLost': VoiceConnectionLostEvent;
  'voice.connectionRestored': VoiceConnectionRestoredEvent;
  'moderation.action': ModerationActionEvent;
  'moderation.warningIssued': WarningIssuedEvent;
  'cooldown.blocked': CooldownBlockedEvent;
  'permission.denied': PermissionDeniedEvent;
  'scheduler.jobDue': SchedulerJobDueEvent;
  'logging.member.nickname_updated': LoggingNicknameUpdatedEvent;
  'logging.message.deleted': LoggingMessageDeletedEvent;
  'logging.message.edited': LoggingMessageEditedEvent;
  'logging.message.bulk_deleted': LoggingMessageBulkDeletedEvent;
  'logging.message.attachments_archived': LoggingAttachmentsArchivedEvent;
  'system.shutdown': ShutdownEvent;
}
