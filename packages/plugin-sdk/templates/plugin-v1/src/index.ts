import { defineEvent, definePlugin } from '@hoakbot/plugin-sdk';
import { z } from 'zod';

export default definePlugin((context) => ({
  id: context.ownerId,
  events: [defineEvent({ id: 'ready', owner: context.ownerId, source: 'internal', priority: 100, payload: z.unknown(), handler: () => context.logger.log('info', 'ready') })],
  start() {
    context.commands.register('hello', () => context.config.get('greeting'));
    context.commands.register('hello:autocomplete', (input) => [String(input)]);
  },
  stop() { context.logger.log('info', 'stopped'); },
}));
