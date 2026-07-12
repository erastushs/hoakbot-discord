import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import { defineCommand } from '../../src/shared/command/define-command.js';
import { validateCommandDescriptors } from '../../src/shared/command/validate-command.js';
import { CommandRegistry } from '../../src/shared/command-registry.js';
import type { ICommand } from '../../src/shared/types/command.js';

const command = (name = 'test', aliases: string[] = []): ICommand => ({ name, description: 'test', category: 'general', prefixAliases: aliases, execute: vi.fn() });

describe('Phase 06 command contract', () => {
  it('preserves concrete command inference and bound execution', async () => {
    const concrete = { ...command('typed'), marker: 'literal' as const };
    const descriptor = defineCommand({ owner: 'test', command: concrete });
    expectTypeOf(descriptor.command.marker).toEqualTypeOf<'literal'>();
    await descriptor.execute({} as never);
    expect(concrete.execute).toHaveBeenCalledOnce();
  });

  it.each([
    [defineCommand({ owner: '', command: command() }), 'Missing command owner'],
    [defineCommand({ owner: 'x', command: command('INVALID NAME') }), 'Invalid command name'],
    [defineCommand({ owner: 'x', command: { ...command(), description: '' } }), 'Invalid command description'],
  ])('rejects malformed descriptors', (descriptor, error) => expect(() => validateCommandDescriptors([descriptor])).toThrow(error));

  it('rejects name and alias collisions atomically', () => {
    const registry = new CommandRegistry();
    registry.register(command('one', ['shared']));
    expect(() => registry.registerMany([command('two'), command('shared')])).toThrow();
    expect(registry.find('two')).toBeNull();
    expect(registry.all()).toHaveLength(1);
  });

  it('rejects missing and invalid autocomplete bindings', () => {
    const slashOptions = new SlashCommandBuilder().setName('search').setDescription('search').addStringOption((option) => option.setName('query').setDescription('query').setAutocomplete(true));
    expect(() => validateCommandDescriptors([defineCommand({ owner: 'x', command: { ...command('search'), slashOptions } })])).toThrow('Missing autocomplete binding');
    const userOptions = new SlashCommandBuilder().setName('user').setDescription('user').addUserOption((option) => option.setName('target').setDescription('target'));
    const descriptor = defineCommand({ owner: 'x', command: { ...command('user'), slashOptions: userOptions }, autocomplete: { target: async () => [] } });
    expect(() => validateCommandDescriptors([descriptor])).toThrow('Invalid autocomplete binding');
  });

  it('derives permission visibility without changing legacy permissions', () => {
    const legacy = { ...command('ban'), requiredPermissions: [PermissionFlagsBits.BanMembers] };
    expect(defineCommand({ owner: 'x', command: legacy }).metadata.visibility).toBe('authorized');
    expect(legacy.requiredPermissions).toEqual([PermissionFlagsBits.BanMembers]);
  });
});
