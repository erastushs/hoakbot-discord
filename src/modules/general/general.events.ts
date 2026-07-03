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

export interface GeneralEventMap {
  'command.executed': CommandExecutedEvent;
  'command.failed': CommandFailedEvent;
  'cooldown.blocked': CooldownBlockedEvent;
  'permission.denied': PermissionDeniedEvent;
  'scheduler.jobDue': SchedulerJobDueEvent;
}
