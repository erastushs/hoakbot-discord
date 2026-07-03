import { describe, it, expect, vi, afterEach } from 'vitest';
import { TemplateService } from '../../src/shared/template/template.service.js';

describe('TemplateService', () => {
  const service = new TemplateService();

  describe('render — basic placeholders', () => {
    it('replaces {user} placeholder', () => {
      expect(service.render('Hello {user}', { user: 'TestUser' })).toBe('Hello TestUser');
    });

    it('replaces {mention} placeholder', () => {
      expect(service.render('Hi {mention}', { mention: '<@123>' })).toBe('Hi <@123>');
    });

    it('replaces {username} placeholder', () => {
      expect(service.render('User: {username}', { username: 'alice' })).toBe('User: alice');
    });

    it('replaces {display_name} placeholder', () => {
      expect(service.render('Display: {display_name}', { display_name: 'Alice' })).toBe('Display: Alice');
    });

    it('replaces {server} placeholder', () => {
      expect(service.render('Welcome to {server}!', { server: 'Test Guild' })).toBe('Welcome to Test Guild!');
    });

    it('replaces {membercount} placeholder', () => {
      expect(service.render('Members: {membercount}', { membercount: 42 })).toBe('Members: 42');
    });

    it('replaces {created} placeholder', () => {
      expect(service.render('Created: {created}', { created: '2021-01-01' })).toBe('Created: 2021-01-01');
    });

    it('replaces {joined} placeholder', () => {
      expect(service.render('Joined: {joined}', { joined: '2021-01-01' })).toBe('Joined: 2021-01-01');
    });

    it('replaces multiple placeholders', () => {
      expect(
        service.render('{mention} joined {server} as #{membercount}', {
          mention: '<@123>',
          server: 'Test Guild',
          membercount: 5,
        }),
      ).toBe('<@123> joined Test Guild as #5');
    });
  });

  describe('render — formatters', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('applies upper formatter', () => {
      expect(service.render('{server.upper}', { server: 'Test Guild' })).toBe('TEST GUILD');
    });

    it('applies lower formatter', () => {
      expect(service.render('{server.lower}', { server: 'TEST GUILD' })).toBe('test guild');
    });

    it('applies title formatter', () => {
      expect(service.render('{server.title}', { server: 'hello world' })).toBe('Hello World');
    });

    it('applies number formatter to membercount', () => {
      expect(service.render('{membercount.number}', { membercount: 1000 })).toBe('1,000');
    });

    it('applies ordinal formatter', () => {
      expect(service.render('{membercount.ordinal}', { membercount: 42 })).toBe('42nd');
    });

    it('applies ordinal_id formatter', () => {
      expect(service.render('{membercount.ordinal_id}', { membercount: 126 })).toBe('ke-126');
    });

    it('applies relative formatter', () => {
      vi.useFakeTimers();
      const now = new Date('2025-01-01T12:00:00Z');
      vi.setSystemTime(now);

      const past = new Date(now.getTime() - 2 * 86400 * 1000).toISOString();
      expect(service.render('Joined {joined.relative}', { joined: past })).toBe('Joined 2 days ago');
    });

    it('applies upper to username', () => {
      expect(service.render('{username.upper}', { username: 'alice' })).toBe('ALICE');
    });

    it('applies lower to display_name', () => {
      expect(service.render('{display_name.lower}', { display_name: 'ALICE' })).toBe('alice');
    });

    it('applies number formatter to large membercount', () => {
      expect(service.render('{membercount.number}', { membercount: 1234567 })).toBe('1,234,567');
    });
  });

  describe('render — unknown handling', () => {
    it('leaves unknown placeholder unchanged', () => {
      expect(service.render('Hello {foo}', {})).toBe('Hello {foo}');
    });

    it('leaves unknown formatter unchanged', () => {
      expect(service.render('{server.reverse}', { server: 'hello' })).toBe('{server.reverse}');
    });

    it('leaves unknown placeholder with valid formatter unchanged', () => {
      expect(service.render('{foo.upper}', {})).toBe('{foo.upper}');
    });

    it('leaves placeholder when context value missing', () => {
      expect(service.render('Hello {user}', {})).toBe('Hello {user}');
    });
  });

  describe('render — edge cases', () => {
    it('handles repeated placeholders', () => {
      expect(service.render('{user} {user} {user}', { user: 'Alice' })).toBe('Alice Alice Alice');
    });

    it('handles empty string', () => {
      expect(service.render('', { user: 'Alice' })).toBe('');
    });

    it('handles no placeholders', () => {
      expect(service.render('Hello world', {})).toBe('Hello world');
    });

    it('does not modify text without braces', () => {
      expect(service.render('user mention server', { user: 'Alice' })).toBe('user mention server');
    });

    it('handles placeholder at start of string', () => {
      expect(service.render('{user} is here', { user: 'Alice' })).toBe('Alice is here');
    });

    it('handles placeholder at end of string', () => {
      expect(service.render('Welcome {user}', { user: 'Alice' })).toBe('Welcome Alice');
    });

    it('handles adjacent placeholders', () => {
      expect(service.render('{mention}{server}', { mention: '<@123>', server: 'Guild' })).toBe('<@123>Guild');
    });
  });

  describe('renderLines', () => {
    it('renders each line', () => {
      const result = service.renderLines(['{user.upper}', 'Joined {server}'], {
        user: 'alice',
        server: 'Test Guild',
      });
      expect(result).toEqual(['ALICE', 'Joined Test Guild']);
    });

    it('handles empty array', () => {
      expect(service.renderLines([], {})).toEqual([]);
    });

    it('preserves empty lines', () => {
      expect(service.renderLines(['first', '', 'third'], {})).toEqual(['first', '', 'third']);
    });
  });

  describe('toOrdinal', () => {
    it('1 -> 1st', () => expect(service.toOrdinal(1)).toBe('1st'));
    it('2 -> 2nd', () => expect(service.toOrdinal(2)).toBe('2nd'));
    it('3 -> 3rd', () => expect(service.toOrdinal(3)).toBe('3rd'));
    it('11 -> 11th', () => expect(service.toOrdinal(11)).toBe('11th'));
    it('12 -> 12th', () => expect(service.toOrdinal(12)).toBe('12th'));
    it('13 -> 13th', () => expect(service.toOrdinal(13)).toBe('13th'));
    it('21 -> 21st', () => expect(service.toOrdinal(21)).toBe('21st'));
    it('22 -> 22nd', () => expect(service.toOrdinal(22)).toBe('22nd'));
    it('23 -> 23rd', () => expect(service.toOrdinal(23)).toBe('23rd'));
    it('101 -> 101st', () => expect(service.toOrdinal(101)).toBe('101st'));
    it('111 -> 111th', () => expect(service.toOrdinal(111)).toBe('111th'));
    it('121 -> 121st', () => expect(service.toOrdinal(121)).toBe('121st'));
  });

  describe('toOrdinalId', () => {
    it('1 -> ke-1', () => expect(service.toOrdinalId(1)).toBe('ke-1'));
    it('126 -> ke-126', () => expect(service.toOrdinalId(126)).toBe('ke-126'));
  });

  describe('registry accessors', () => {
    it('exposes PlaceholderRegistry', () => {
      const placeholderRegistry = service.getPlaceholderRegistry();
      expect(placeholderRegistry.get('server')).toBeDefined();
    });

    it('exposes FormatterRegistry', () => {
      const formatterRegistry = service.getFormatterRegistry();
      expect(formatterRegistry.has('upper')).toBe(true);
    });
  });

  describe('null-safe behavior', () => {
    it('leaves ordinal unchanged when membercount missing', () => {
      expect(service.render('{membercount.ordinal}', {})).toBe('{membercount.ordinal}');
    });

    it('leaves ordinal unchanged when membercount undefined', () => {
      expect(service.render('{membercount.ordinal}', { membercount: undefined })).toBe('{membercount.ordinal}');
    });
  });
});
