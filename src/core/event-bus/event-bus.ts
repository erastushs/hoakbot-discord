import type { EventMap } from './events.js';
import type { EventHandler, EventName, IEventBus, Subscription } from './types.js';
import type { ILogger } from '../logger/logger.service.js';

interface HandlerEntry<T extends EventName> {
  handler: EventHandler<T>;
  once: boolean;
}

export class EventBus implements IEventBus {
  private readonly handlers = new Map<EventName, HandlerEntry<EventName>[]>();

  constructor(private readonly logger: ILogger) {}

  subscribe<T extends EventName>(event: T, handler: EventHandler<T>): Subscription {
    return this.addHandler(event, handler, false);
  }

  once<T extends EventName>(event: T, handler: EventHandler<T>): Subscription {
    return this.addHandler(event, handler, true);
  }

  emit<T extends EventName>(event: T, ...args: EventMap[T] extends void ? [] : [EventMap[T]]): void {
    const entries = this.handlers.get(event);
    if (!entries || entries.length === 0) {
      return;
    }

    this.logger.debug({ event, subscriberCount: entries.length }, 'Event emitted');

    const toRemove: HandlerEntry<T>[] = [];

    for (const entry of entries) {
      try {
        const payload = args[0] as EventMap[T];
        const result = entry.handler(payload);
        if (result instanceof Promise) {
          result.catch((err: unknown) => {
            this.logger.error({ event, error: err }, 'Async event handler failed');
          });
        }
        if (entry.once) {
          toRemove.push(entry);
        }
      } catch (err) {
        this.logger.error({ event, error: err }, 'Event handler failed');
        if (entry.once) {
          toRemove.push(entry);
        }
      }
    }

    if (toRemove.length > 0) {
      const current = this.handlers.get(event);
      if (current) {
        const updated = current.filter((e) => !toRemove.includes(e as HandlerEntry<T>));
        if (updated.length === 0) {
          this.handlers.delete(event);
        } else {
          this.handlers.set(event, updated);
        }
      }
    }
  }

  subscriberCount(event: EventName): number {
    return this.handlers.get(event)?.length ?? 0;
  }

  removeAllListeners(): void {
    this.handlers.clear();
  }

  private addHandler<T extends EventName>(event: T, handler: EventHandler<T>, once: boolean): Subscription {
    const entries = this.handlers.get(event) ?? [];
    const entry: HandlerEntry<T> = { handler, once };
    entries.push(entry as HandlerEntry<EventName>);
    this.handlers.set(event, entries);

    return {
      unsubscribe: () => {
        const current = this.handlers.get(event);
        if (current) {
          const filtered = current.filter((e) => e !== (entry as HandlerEntry<EventName>));
          if (filtered.length === 0) {
            this.handlers.delete(event);
          } else {
            this.handlers.set(event, filtered);
          }
        }
      },
    };
  }
}
