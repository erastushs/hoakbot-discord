export interface BotReadyEvent {
  guildCount: number;
  pingMs: number;
}

export interface BotErrorEvent {
  error: Error;
  source: string;
}

export type ShutdownEvent = void;

export interface CoreSystemEventMap {
  'bot.ready': BotReadyEvent;
  'bot.error': BotErrorEvent;
  'system.shutdown': ShutdownEvent;
}
