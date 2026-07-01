import { describe, it, expect } from 'vitest';
import { CommandRegistry } from '../../src/shared/command-registry.js';

function mockCommand(name: string, aliases?: string[]) {
  return {
    name,
    description: 'test',
    category: 'general',
    prefixAliases: aliases,
    execute: async () => {},
  };
}

describe('CommandRegistry', () => {
  it('registers a command', () => {
    const registry = new CommandRegistry();
    const cmd = mockCommand('ping');
    registry.register(cmd);
    expect(registry.find('ping')).toBe(cmd);
  });

  it('is case insensitive', () => {
    const registry = new CommandRegistry();
    const cmd = mockCommand('Ping');
    registry.register(cmd);
    expect(registry.find('ping')).toBe(cmd);
    expect(registry.find('PING')).toBe(cmd);
  });

  it('returns null for unknown command', () => {
    const registry = new CommandRegistry();
    expect(registry.find('nonexistent')).toBeNull();
  });

  it('throws on duplicate registration', () => {
    const registry = new CommandRegistry();
    registry.register(mockCommand('ping'));
    expect(() => registry.register(mockCommand('Ping'))).toThrow('Duplicate command: ping');
  });

  it('registers and finds by alias', () => {
    const registry = new CommandRegistry();
    const cmd = mockCommand('help', ['h', 'hlp']);
    registry.register(cmd);
    expect(registry.findByAlias('h')).toBe(cmd);
    expect(registry.findByAlias('hlp')).toBe(cmd);
  });

  it('alias lookup is case insensitive', () => {
    const registry = new CommandRegistry();
    const cmd = mockCommand('help', ['H']);
    registry.register(cmd);
    expect(registry.findByAlias('h')).toBe(cmd);
  });

  it('returns null for unknown alias', () => {
    const registry = new CommandRegistry();
    registry.register(mockCommand('help', ['h']));
    expect(registry.findByAlias('x')).toBeNull();
  });

  it('throws on duplicate alias', () => {
    const registry = new CommandRegistry();
    registry.register(mockCommand('help', ['h']));
    expect(() => registry.register(mockCommand('halp', ['h']))).toThrow(
      'Duplicate alias: h for command halp',
    );
  });

  it('handles commands with no aliases', () => {
    const registry = new CommandRegistry();
    const cmd = mockCommand('ping');
    registry.register(cmd);
    expect(registry.findByAlias('ping')).toBeNull();
  });

  it('all() returns all registered commands', () => {
    const registry = new CommandRegistry();
    const ping = mockCommand('ping');
    const help = mockCommand('help');
    registry.register(ping);
    registry.register(help);
    const all = registry.all();
    expect(all).toHaveLength(2);
    expect(all).toContain(ping);
    expect(all).toContain(help);
  });

  it('all() returns a copy', () => {
    const registry = new CommandRegistry();
    registry.register(mockCommand('ping'));
    const all = registry.all();
    all.pop();
    expect(registry.all()).toHaveLength(1);
  });
});
