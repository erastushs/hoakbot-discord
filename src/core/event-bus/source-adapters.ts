import type { EventDefinition } from '@hoakbot/plugin-contracts';
import type { Client } from 'discord.js';
import type { IEventBus, EventName } from './types.js';
import type { EventCoordinator } from './event-registry.js';

export interface EventSourceAdapter { bind(definition: EventDefinition): () => void }

export class InternalEventSourceAdapter implements EventSourceAdapter {
  constructor(private readonly bus: IEventBus, private readonly coordinator: EventCoordinator) {}
  bind(definition: EventDefinition): () => void {
    const subscriptions = [definition.id, ...definition.aliases].map((name) => this.bus.subscribe(name as EventName, (payload) => { void this.coordinator.dispatch(definition.id, payload); }));
    return () => subscriptions.forEach(({ unsubscribe }) => unsubscribe());
  }
}

export class DiscordEventSourceAdapter implements EventSourceAdapter {
  private readonly bindings = new Map<string, { targets: Map<string, number>; listener: (...args: unknown[]) => void }>();
  constructor(private readonly client: Pick<Client, 'on' | 'off'>, private readonly coordinator: EventCoordinator, private readonly names: Readonly<Record<string, string>>) {}
  bind(definition: EventDefinition): () => void {
    const sourceName = this.names[definition.id];
    if (!sourceName) throw new Error(`Discord source mapping is missing: ${definition.id}`);
    const existing = this.bindings.get(sourceName);
    const target = definition.id;
    if (existing) existing.targets.set(target, (existing.targets.get(target) ?? 0) + 1);
    else {
      const targets = new Map([[target, 1]]);
      const listener = (...args: unknown[]) => { const payload = args.length === 1 ? args[0] : args; for (const canonical of targets.keys()) void this.coordinator.dispatch(canonical, payload); };
      this.client.on(sourceName, listener);
      this.bindings.set(sourceName, { targets, listener });
    }
    return () => { const binding = this.bindings.get(sourceName); if (!binding) return; const count = binding.targets.get(target) ?? 0; if (count <= 1) binding.targets.delete(target); else binding.targets.set(target, count - 1); if (binding.targets.size === 0) { this.client.off(sourceName, binding.listener); this.bindings.delete(sourceName); } };
  }
}

export class ConfigurationEventSourceAdapter extends InternalEventSourceAdapter {}

export class EventSourceCoordinator {
  constructor(private readonly adapters: Readonly<Record<EventDefinition['source'], EventSourceAdapter>>) {}
  start(definitions: readonly EventDefinition[]): () => void {
    const stops: (() => void)[] = [];
    try { for (const definition of definitions) stops.push(this.adapters[definition.source].bind(definition)); }
    catch (error) { for (const stop of stops.reverse()) stop(); throw error; }
    let active = true;
    return () => { if (!active) return; active = false; for (const stop of stops.reverse()) stop(); };
  }
}
