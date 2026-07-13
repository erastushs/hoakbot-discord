import type { EventDefinition } from '@hoakbot/plugin-contracts';

export type EventLifecycleState = 'started' | 'stopping' | 'stopped';
export interface EventDiagnostic { readonly code: 'event.handler_failed' | 'event.handler_timeout' | 'event.payload_invalid'; readonly event: string; readonly owner: string; readonly error: unknown }
export interface EventDispatchResult { readonly delivered: number; readonly diagnostics: readonly EventDiagnostic[] }

export class EventRegistry {
  private readonly definitions = new Map<string, EventDefinition>();
  private readonly aliases = new Map<string, string>();
  private readonly states = new Map<string, EventLifecycleState>();

  register(definition: EventDefinition): () => void {
    const key = `${definition.owner}:${definition.id}`;
    if (this.definitions.has(key)) throw new Error(`Event ownership is already registered: ${key}`);
    for (const alias of definition.aliases) {
      const target = this.aliases.get(alias);
      if (alias === definition.id || (target && target !== definition.id)) throw new Error(`Event alias is already registered: ${alias}`);
    }
    this.definitions.set(key, definition);
    for (const alias of definition.aliases) this.aliases.set(alias, definition.id);
    return () => this.unregister(definition);
  }

  setOwnerState(owner: string, state: EventLifecycleState): void { this.states.set(owner, state); }
  ownerState(owner: string): EventLifecycleState { return this.states.get(owner) ?? 'stopped'; }
  resolve(name: string): readonly EventDefinition[] {
    const canonical = this.aliases.get(name) ?? name;
    return [...this.definitions.values()].filter(({ id }) => id === canonical).sort(compareEvents);
  }
  hasOwner(owner: string): boolean { return [...this.definitions.values()].some((definition) => definition.owner === owner); }

  private unregister(definition: EventDefinition): void {
    const key = `${definition.owner}:${definition.id}`;
    if (this.definitions.get(key) !== definition) return;
    this.definitions.delete(key);
    for (const alias of definition.aliases) if (this.aliases.get(alias) === definition.id) this.aliases.delete(alias);
  }
}

export class EventCoordinator {
  constructor(private readonly registry: EventRegistry, private readonly report: (diagnostic: EventDiagnostic) => void = () => undefined) {}

  install(definitions: readonly EventDefinition[]): { activate(): void; stop(): void } {
    const owners = new Set(definitions.map(({ owner }) => owner));
    for (const definition of definitions) for (const dependency of definition.dependencies) {
      if (!owners.has(dependency) && !this.registry.hasOwner(dependency)) throw new Error(`Missing event dependency ${dependency} for ${definition.owner}:${definition.id}`);
      if (!owners.has(dependency) && this.registry.ownerState(dependency) !== 'started') throw new Error(`Event dependency is not started: ${dependency}`);
    }
    const ordered = topologicalOrder(definitions);
    const unregister = ordered.map((definition) => this.registry.register(definition));
    let stopped = false;
    return { activate: () => { if (!stopped) for (const owner of owners) this.registry.setOwnerState(owner, 'started'); }, stop: () => { if (stopped) return; stopped = true; for (const owner of owners) this.registry.setOwnerState(owner, 'stopping'); for (const remove of unregister.reverse()) remove(); for (const owner of owners) this.registry.setOwnerState(owner, 'stopped'); } };
  }

  start(definitions: readonly EventDefinition[]): () => void { const installation = this.install(definitions); installation.activate(); return () => installation.stop(); }

  async dispatch(name: string, payload: unknown): Promise<EventDispatchResult> {
    const diagnostics: EventDiagnostic[] = [];
    let delivered = 0;
    for (const definition of this.registry.resolve(name)) {
      if (this.registry.ownerState(definition.owner) !== 'started') continue;
      let parsed: unknown;
      try { parsed = definition.payload.parse(payload); } catch (error) { diagnostics.push(this.diagnose('event.payload_invalid', definition, error)); continue; }
      const controller = new AbortController();
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([Promise.resolve(definition.handler(parsed, { signal: controller.signal, event: definition.id, owner: definition.owner })), new Promise<never>((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error(`Event handler timed out after ${definition.timeoutMs}ms`)); }, definition.timeoutMs); })]);
        delivered++;
      } catch (error) {
        const code = controller.signal.aborted ? 'event.handler_timeout' : 'event.handler_failed';
        diagnostics.push(this.diagnose(code, definition, error));
        if (definition.failure === 'stop') break;
      } finally { if (timer) clearTimeout(timer); }
    }
    return { delivered, diagnostics };
  }

  private diagnose(code: EventDiagnostic['code'], definition: EventDefinition, error: unknown): EventDiagnostic { const diagnostic = { code, event: definition.id, owner: definition.owner, error: redactDiagnosticError(error) }; this.report(diagnostic); return diagnostic; }
}

function redactDiagnosticError(error: unknown): unknown {
  if (error instanceof Error) return Object.freeze({ name: error.name, message: error.message.replace(/(value|secret|token|password)\s*[:=]\s*[^,;\s]+/gi, '$1=[REDACTED]') });
  return Object.freeze({ name: 'Error', message: 'Event processing failed.' });
}
function compareEvents(left: EventDefinition, right: EventDefinition): number { return right.priority - left.priority || left.owner.localeCompare(right.owner) || left.id.localeCompare(right.id); }
function topologicalOrder(definitions: readonly EventDefinition[]): EventDefinition[] {
  const pending = [...definitions]; const result: EventDefinition[] = []; const completed = new Set<string>();
  while (pending.length) {
    const ready = pending.filter(({ dependencies }) => dependencies.every((dependency) => completed.has(dependency) || !pending.some(({ owner }) => owner === dependency))).sort(compareEvents);
    if (!ready.length) throw new Error('Cyclic event owner dependencies');
    for (const definition of ready) { result.push(definition); pending.splice(pending.indexOf(definition), 1); completed.add(definition.owner); }
  }
  return result;
}
