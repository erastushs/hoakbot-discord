import { definePlugin } from '@hoakbot/plugin-sdk';

export default definePlugin((context) => ({
  id: context.ownerId,
  start() {
    context.commands.register('hello', () => context.config.get('greeting'));
    context.commands.register('hello:autocomplete', (input) => [String(input)]);
    context.events.on('ready:priority:100', () => context.logger.log('info', 'ready'));
  },
  stop() { context.logger.log('info', 'stopped'); },
}));
