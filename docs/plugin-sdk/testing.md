# Testing and assets

`@hoakbot/plugin-sdk/testing` is framework-neutral and depends only on platform assertions in generated tests. `createPluginTestHarness` starts and stops a factory, records registrations/logs, and accepts test config. It has no Vitest runtime dependency.

```ts
import { definePlugin } from '@hoakbot/plugin-sdk';
import { createPluginTestHarness } from '@hoakbot/plugin-sdk/testing';

const manifest = {
  schemaVersion: 1 as const,
  id: 'example',
  name: 'Example',
  description: 'Example plugin',
  version: '1.0.0',
  dependencies: [],
  capabilities: {
    settings: [],
    commands: ['hello'],
    events: [],
    routes: [],
    permissions: [],
    ownership: {
      routes: { owners: [], contributors: [] },
      events: { publishers: [], subscribers: [] },
      commands: ['hello'],
      schedulers: [],
      assets: [],
    },
  },
};
const plugin = definePlugin((context) => ({ id: context.ownerId, start() { context.commands.register('hello', () => 'hello'); } }));
const harness = createPluginTestHarness(manifest);
await harness.start(plugin);
await harness.stop();
```

Assets must be declared in manifest metadata, included by package `files`, and addressed package-relatively. `check` inventories files with SHA-256 hashes.
