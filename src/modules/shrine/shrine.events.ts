import type { ShrineRotation } from './types.js';

export interface ShrineUpdatedEvent {
  guildId: string;
  channelId: string;
  rotation: ShrineRotation;
}

export interface ShrinePollFailedEvent {
  guildId: string;
  error: unknown;
}

export interface ShrineEventMap {
  'shrine.updated': ShrineUpdatedEvent;
  'shrine.poll_failed': ShrinePollFailedEvent;
}
