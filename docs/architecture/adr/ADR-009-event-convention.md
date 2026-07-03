# ADR-009: Event Naming Convention & Ownership

**Status:** Accepted  
**Applies to:** v3.0 Milestone 5  
**Dependencies:** None  

## Context

v2 defines all events in a single `core/event-bus/events.ts` file. This creates a single point of coupling — every module's events are known by the core. In v3, modules should own their events.

## Decision

### Ownership

Each module defines its own events in its `<name>.events.ts` or `types.ts`. Only infrastructure events (system-level) live in the core EventBus.

```typescript
// Core events (src/core/event-bus/events.ts)
interface BotReadyEvent { ... }
interface BotErrorEvent { ... }
interface ConfigChangedEvent { ... }   // Infrastructure event
interface ShutdownEvent { ... }

// Module events (src/modules/voice/types.ts)
interface VoiceMemberJoinedEvent { ... }
interface VoiceSoundPlayedEvent { ... }

// Module events (src/modules/moderation/types.ts)
interface ModerationActionEvent { ... }
```

### Naming Convention

```
Event naming: [domain].[entity].[action]
Examples:
  voice.member.joined
  voice.sound.played
  moderation.action.executed
  config.setting.changed
  system.bot.ready
  system.shutdown

Event naming rules:
- Lowercase with dots (like DNS)
- Domain = module ID or "system" / "config"
- Entity = the logical subject
- Action = past tense verb
- No underscores, no camelCase in event names
```

### Registration

Modules register their event subscriptions during `onRegister()`:

```typescript
class VoiceModule implements IModule {
  async onRegister(ctx: IModuleContext): Promise<void> {
    ctx.eventBus.subscribe('voice.member.joined', this.handleMemberJoined.bind(this));
    ctx.eventBus.subscribe('config.setting.changed', this.handleConfigChange.bind(this));
  }
}
```

Events a module publishes are documented in its manifest:

```typescript
const manifest: IModuleManifest = {
  // ...
  events: [
    'voice.member.joined',
    'voice.sound.played',
    'voice.connection.lost',
  ],
};
```

### Config Changed Event (Infrastructure)

```typescript
interface ConfigChangedEvent {
  key: string;
  oldValue: unknown;
  newValue: unknown;
  guildId: string;
  changedBy: string;
  source: 'api' | 'cli' | 'bot' | 'file';
  timestamp: number;
}
```

This event is published by the Configuration Provider whenever a setting changes. Modules subscribe to react without polling.

## Consequences

**Positive:**
- Modules own their events — no single file becomes a coupling bottleneck
- Event naming is consistent and self-documenting
- Manifests document event contracts explicitly

**Negative:**
- Event names must not collide across modules (namespaced by module ID)
- Modules must import each other's event types (but only through interfaces, never implementations)

## Related

- ADR-001: Module Manifest
- ADR-010: Config Lifecycle
