import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { describe, expect, it, vi } from 'vitest';
import { HelpCommand } from '../../src/modules/general/commands/help.command.js';
import { CommandIndexer } from '../../src/modules/general/help/command-indexer.js';
import { HELP_IDS, HelpComponentBuilder } from '../../src/modules/general/help/help-component-builder.js';
import { HelpEmbedBuilder } from '../../src/modules/general/help/help-embed-builder.js';
import { HelpInteractionHandler } from '../../src/modules/general/help/help-interaction-handler.js';
import { HelpService } from '../../src/modules/general/help/help-service.js';
import { CommandRegistry } from '../../src/shared/command-registry.js';
import type { ICommand } from '../../src/shared/types/command.js';

function command(overrides: Partial<ICommand> & Pick<ICommand, 'name'>): ICommand {
  return {
    description: `${overrides.name} description`,
    category: 'general',
    execute: async () => {},
    ...overrides,
  };
}

function setup(commands: ICommand[] = []) {
  const registry = new CommandRegistry();
  commands.forEach((entry) => registry.register(entry));
  const indexer = new CommandIndexer(registry);
  const service = new HelpService(indexer, '!', '3.2.3');
  return { registry, indexer, service };
}

function embed(payload: unknown) {
  return (payload as { embeds: { toJSON(): Record<string, unknown> }[] }).embeds[0].toJSON();
}

function components(payload: unknown) {
  return (payload as { components: { toJSON(): Record<string, unknown> }[] }).components.map((row) => row.toJSON());
}

describe('CommandIndexer', () => {
  it('discovers categories dynamically, filters hidden commands, and sorts categories and commands', () => {
    const hidden = command({ name: 'secret', category: 'staff', hidden: true });
    const { indexer, registry } = setup([
      command({ name: 'zeta', category: 'general' }),
      hidden,
      command({ name: 'alpha', category: 'admin' }),
      command({ name: 'beta', category: 'general' }),
    ]);

    expect(indexer.commands().map((entry) => entry.name)).toEqual(['alpha', 'beta', 'zeta']);
    expect(indexer.categories().map((entry) => [entry.name, entry.commands.map((item) => item.name)])).toEqual([
      ['Admin', ['alpha']],
      ['General', ['beta', 'zeta']],
    ]);

    registry.register(command({ name: 'music', category: 'audio' }));
    expect(indexer.categories().map((entry) => entry.name)).toEqual(['Admin', 'Audio', 'General']);
  });

  it('finds commands by trimmed case-insensitive names and aliases', () => {
    const target = command({ name: 'Ban', prefixAliases: ['B', 'remove'] });
    const { indexer } = setup([target]);

    expect(indexer.find(' BAN ')).toBe(target);
    expect(indexer.find(' b ')).toBe(target);
    expect(indexer.find('REMOVE')).toBe(target);
    expect(indexer.find('missing')).toBeNull();
  });
});

describe('HelpEmbedBuilder', () => {
  it('uses the exact requested home description with visible statistics and version', () => {
    const { indexer } = setup([
      command({ name: 'ping', category: 'general' }),
      command({ name: 'ban', category: 'admin' }),
      command({ name: 'secret', category: 'admin', hidden: true }),
    ]);
    const json = new HelpEmbedBuilder(indexer, '!', '9.8.7').home('https://example.test/avatar.png').toJSON();

    expect(json.description).toBe('Use the menu below to browse commands.\n\n**Total Commands:** 2\n**Categories:** 2\n**Version:** 9.8.7');
    expect(json.thumbnail?.url).toBe('https://example.test/avatar.png');
  });

  it('renders category command names, descriptions, prefix usage, and permissions', () => {
    const entries = [
      command({ name: 'ban', description: 'Ban a member', category: 'admin', requiredPermissions: [PermissionFlagsBits.BanMembers] }),
      command({ name: 'kick', description: 'Kick a member', category: 'admin' }),
    ];
    const { indexer } = setup(entries);
    const json = new HelpEmbedBuilder(indexer, '?', '1').category(indexer.categories()[0]).toJSON();

    expect(json.title).toBe('Admin Commands');
    expect(json.description).toBe('**/ban** · **?ban**\nBan a member\nPermissions: Ban Members\n\n**/kick** · **?kick**\nKick a member\nPermissions: None');
  });

  it('renders full command detail including required and optional options, aliases, and permissions', () => {
    const target = command({
      name: 'manage',
      description: 'Manage a member',
      category: 'admin',
      prefixAliases: ['m', 'mod'],
      requiredPermissions: [PermissionFlagsBits.ManageGuild],
      slashOptions: new SlashCommandBuilder()
        .setName('manage')
        .setDescription('Manage a member')
        .addUserOption((option) => option.setName('member').setDescription('Member').setRequired(true))
        .addStringOption((option) => option.setName('reason').setDescription('Reason')),
    });
    const json = new HelpEmbedBuilder(setup([target]).indexer, '!', '1').command(target).toJSON();

    expect(json.title).toBe('/manage');
    expect(json.description).toBe('Manage a member');
    expect(json.fields).toEqual([
      { name: 'Usage', value: '`/manage <member> [reason]`\n`!manage <member> [reason]`' },
      { name: 'Examples', value: '`/manage`\n`!manage`' },
      { name: 'Aliases', value: 'm, mod', inline: true },
      { name: 'Permissions', value: 'Manage Guild', inline: true },
      { name: 'Category', value: 'admin', inline: true },
    ]);
  });
});

describe('HelpComponentBuilder', () => {
  it('builds select options from dynamic categories with command counts', () => {
    const { indexer } = setup([
      command({ name: 'ban', category: 'admin' }),
      command({ name: 'ping', category: 'general' }),
      command({ name: 'help', category: 'general' }),
    ]);
    const rows = new HelpComponentBuilder().home(indexer.categories()).map((row) => row.toJSON());

    expect(rows).toHaveLength(1);
    expect(rows[0].components[0]).toMatchObject({
      custom_id: `${HELP_IDS.category}:0`,
      placeholder: 'Select a command category',
      options: [
        { label: 'Admin', value: 'Admin', description: '1 command' },
        { label: 'General', value: 'General', description: '2 commands' },
      ],
    });
  });

  it('paginates select options at Discord limits', () => {
    const categories = Array.from({ length: 30 }, (_, index) => ({ name: `Category ${index}`, commands: [command({ name: `command${index}` })] }));
    const rows = new HelpComponentBuilder().home(categories).map((row) => row.toJSON());

    expect(rows.map((row) => row.components[0].custom_id)).toEqual([`${HELP_IDS.category}:0`, `${HELP_IDS.category}:1`]);
    expect(rows.map((row) => row.components[0].options?.length)).toEqual([25, 5]);
  });
});

describe('HelpService and HelpCommand', () => {
  it('shows home and resolves command detail through an alias while rejecting hidden commands', async () => {
    const visible = command({ name: 'ping', category: 'general', prefixAliases: ['p'] });
    const hidden = command({ name: 'secret', hidden: true });
    const { service } = setup([visible, hidden]);
    const reply = vi.fn().mockResolvedValue(undefined);
    const ctx = { reply, user: { client: { user: { displayAvatarURL: () => 'https://example.test/avatar.png' } } } } as never;

    await service.show(ctx);
    expect(embed(reply.mock.calls[0][0]).title).toBe('📚 Hoak Bot Help');
    expect(components(reply.mock.calls[0][0])[0].components).toHaveLength(1);

    await service.show(ctx, 'P');
    expect(embed(reply.mock.calls[1][0]).title).toBe('/ping');

    await service.show(ctx, 'secret');
    expect(embed(reply.mock.calls[2][0]).title).toBe('Command not found');
  });

  it('passes trimmed slash and prefix queries to the service', async () => {
    const show = vi.fn().mockResolvedValue(undefined);
    const help = new HelpCommand({ show } as never);

    await help.execute({ source: 'slash', args: new Map([['command', '  ping  ']]) } as never);
    await help.execute({ source: 'prefix', args: new Map([['_suffix', '  p  ']]) } as never);
    await help.execute({ source: 'prefix', args: new Map([['_suffix', '   ']]) } as never);

    expect(show.mock.calls.map((call) => call[1])).toEqual(['ping', 'p', undefined]);
  });
});

describe('HelpInteractionHandler', () => {
  it('updates the same message for category, back, and home navigation', async () => {
    const { service } = setup([command({ name: 'ping', category: 'general' })]);
    const handler = new HelpInteractionHandler(service);
    const categoryUpdate = vi.fn().mockResolvedValue(undefined);

    await handler.handle({
      customId: `${HELP_IDS.category}:0`,
      values: ['General'],
      isStringSelectMenu: () => true,
      update: categoryUpdate,
    } as never);
    expect(categoryUpdate).toHaveBeenCalledTimes(1);
    expect(embed(categoryUpdate.mock.calls[0][0]).title).toBe('General Commands');
    expect(components(categoryUpdate.mock.calls[0][0])[0].components).toMatchObject([
      { custom_id: HELP_IDS.back, label: 'Back' },
      { custom_id: HELP_IDS.home, label: 'Home' },
    ]);

    const backUpdate = vi.fn().mockResolvedValue(undefined);
    await handler.handle({ customId: `${HELP_IDS.back}:General`, isStringSelectMenu: () => false, update: backUpdate } as never);
    expect(embed(backUpdate.mock.calls[0][0]).title).toBe('General Commands');

    const categoryBackUpdate = vi.fn().mockResolvedValue(undefined);
    await handler.handle({
      customId: HELP_IDS.back,
      isStringSelectMenu: () => false,
      update: categoryBackUpdate,
      client: { user: { displayAvatarURL: () => 'https://example.test/avatar.png' } },
    } as never);
    expect(embed(categoryBackUpdate.mock.calls[0][0]).title).toBe('📚 Hoak Bot Help');

    const homeUpdate = vi.fn().mockResolvedValue(undefined);
    await handler.handle({
      customId: HELP_IDS.home,
      isStringSelectMenu: () => false,
      update: homeUpdate,
      client: { user: { displayAvatarURL: () => 'https://example.test/avatar.png' } },
    } as never);
    expect(embed(homeUpdate.mock.calls[0][0]).title).toBe('📚 Hoak Bot Help');
  });

  it('defers invalid category selections and ignores unrelated interactions', async () => {
    const handler = new HelpInteractionHandler(setup([]).service);
    const deferUpdate = vi.fn().mockResolvedValue(undefined);
    const update = vi.fn();

    await handler.handle({ customId: `${HELP_IDS.category}:0`, values: ['Missing'], isStringSelectMenu: () => true, deferUpdate, update } as never);
    await handler.handle({ customId: 'other', isStringSelectMenu: () => false, update } as never);

    expect(deferUpdate).toHaveBeenCalledOnce();
    expect(update).not.toHaveBeenCalled();
    expect(handler.owns(HELP_IDS.home)).toBe(true);
    expect(handler.owns('other')).toBe(false);
  });
});
