import test from 'node:test';
import assert from 'node:assert/strict';
import manifest from '../hoakbot.plugin.json' with { type: 'json' };
import plugin from '../src/index.js';
import { parseManifest } from '@hoakbot/plugin-sdk';
import { createPluginTestHarness, type PluginTestHarness } from '@hoakbot/plugin-sdk/testing';

test('registers declared capabilities', async () => { const harness: PluginTestHarness = createPluginTestHarness(parseManifest(manifest), { greeting: 'hello' }); await harness.start(plugin); assert.equal(harness.registrations.length, 3); await harness.stop(); });
