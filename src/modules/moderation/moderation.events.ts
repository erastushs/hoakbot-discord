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

export interface ModerationEventMap {
  'moderation.action': ModerationActionEvent;
  'moderation.warningIssued': WarningIssuedEvent;
}
