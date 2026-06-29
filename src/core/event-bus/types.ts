import type { EventMap } from './events.js';

export type EventName = keyof EventMap;

export type EventHandler<T extends EventName> = (payload: EventMap[T]) => void | Promise<void>;

export interface Subscription {
  unsubscribe(): void;
}

export interface IEventBus {
  subscribe<T extends EventName>(event: T, handler: EventHandler<T>): Subscription;
  once<T extends EventName>(event: T, handler: EventHandler<T>): Subscription;
  emit<T extends EventName>(event: T, ...args: EventMap[T] extends void ? [] : [EventMap[T]]): void;
  subscriberCount(event: EventName): number;
  removeAllListeners(): void;
}
