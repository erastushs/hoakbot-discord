import { describe, it, expect } from 'vitest';
import { TemplateService } from '../../src/shared/template/template.service.js';
import type { TemplateContext } from '../../src/shared/template/template.service.js';

describe('TemplateService', () => {
  const service = new TemplateService();

  describe('render', () => {
    it('replaces {user} placeholder', () => {
      const result = service.render('Hello {user}', { user: 'TestUser' });
      expect(result).toBe('Hello TestUser');
    });

    it('replaces {mention} placeholder', () => {
      const result = service.render('Hi {mention}', { mention: '<@123>' });
      expect(result).toBe('Hi <@123>');
    });

    it('replaces {username} placeholder', () => {
      const result = service.render('User: {username}', { username: 'alice' });
      expect(result).toBe('User: alice');
    });

    it('replaces {display_name} placeholder', () => {
      const result = service.render('Display: {display_name}', { display_name: 'Alice' });
      expect(result).toBe('Display: Alice');
    });

    it('replaces {server} placeholder', () => {
      const result = service.render('Welcome to {server}!', { server: 'Test Guild' });
      expect(result).toBe('Welcome to Test Guild!');
    });

    it('replaces {membercount} placeholder', () => {
      const result = service.render('Members: {membercount}', { membercount: 42 });
      expect(result).toBe('Members: 42');
    });

    it('replaces {membercount.ordinal} placeholder (English)', () => {
      const result = service.render('You are {membercount.ordinal}', { membercount: 42 });
      expect(result).toBe('You are 42nd');
    });

    it('replaces {membercount.ordinal_id} placeholder (Indonesian)', () => {
      const result = service.render('Anda yang {membercount.ordinal_id}', { membercount: 126 });
      expect(result).toBe('Anda yang ke-126');
    });

    it('replaces {created} placeholder', () => {
      const result = service.render('Created: {created}', { created: '2021-01-01' });
      expect(result).toBe('Created: 2021-01-01');
    });

    it('replaces {joined} placeholder', () => {
      const result = service.render('Joined: {joined}', { joined: '2021-01-01' });
      expect(result).toBe('Joined: 2021-01-01');
    });

    it('replaces multiple placeholders in one template', () => {
      const result = service.render('{mention} joined {server} as #{membercount}', {
        mention: '<@123>',
        server: 'Test Guild',
        membercount: 5,
      });
      expect(result).toBe('<@123> joined Test Guild as #5');
    });

    it('leaves unknown placeholders unchanged', () => {
      const result = service.render('Hello {foo} and {bar}', { username: 'test' });
      expect(result).toBe('Hello {foo} and {bar}');
    });

    it('leaves placeholder unchanged when context value is missing', () => {
      const result = service.render('Hello {user}', {});
      expect(result).toBe('Hello {user}');
    });

    it('handles repeated placeholders', () => {
      const result = service.render('{user} {user} {user}', { user: 'Alice' });
      expect(result).toBe('Alice Alice Alice');
    });

    it('handles empty string template', () => {
      const result = service.render('', { user: 'Alice' });
      expect(result).toBe('');
    });

    it('handles template with no placeholders', () => {
      const result = service.render('Hello world', {});
      expect(result).toBe('Hello world');
    });

    it('does not modify text without braces', () => {
      const result = service.render('user mention server', { user: 'Alice' });
      expect(result).toBe('user mention server');
    });
  });

  describe('renderLines', () => {
    it('renders each line in an array', () => {
      const result = service.renderLines(['Line1 {user}', 'Line2 {server}'], {
        user: 'Alice',
        server: 'Test Guild',
      });
      expect(result).toEqual(['Line1 Alice', 'Line2 Test Guild']);
    });

    it('handles empty array', () => {
      const result = service.renderLines([], {});
      expect(result).toEqual([]);
    });

    it('handles lines with mixed placeholders', () => {
      const result = service.renderLines(
        ['Hello {mention}', '', 'Server: {server}'],
        { mention: '<@123>', server: 'Test Guild' },
      );
      expect(result).toEqual(['Hello <@123>', '', 'Server: Test Guild']);
    });

    it('preserves empty lines', () => {
      const result = service.renderLines(['first', '', 'third'], {});
      expect(result).toEqual(['first', '', 'third']);
    });
  });

  describe('toOrdinal', () => {
    it('1 -> 1st', () => expect(service.toOrdinal(1)).toBe('1st'));
    it('2 -> 2nd', () => expect(service.toOrdinal(2)).toBe('2nd'));
    it('3 -> 3rd', () => expect(service.toOrdinal(3)).toBe('3rd'));
    it('4 -> 4th', () => expect(service.toOrdinal(4)).toBe('4th'));
    it('10 -> 10th', () => expect(service.toOrdinal(10)).toBe('10th'));
    it('11 -> 11th', () => expect(service.toOrdinal(11)).toBe('11th'));
    it('12 -> 12th', () => expect(service.toOrdinal(12)).toBe('12th'));
    it('13 -> 13th', () => expect(service.toOrdinal(13)).toBe('13th'));
    it('21 -> 21st', () => expect(service.toOrdinal(21)).toBe('21st'));
    it('22 -> 22nd', () => expect(service.toOrdinal(22)).toBe('22nd'));
    it('23 -> 23rd', () => expect(service.toOrdinal(23)).toBe('23rd'));
    it('101 -> 101st', () => expect(service.toOrdinal(101)).toBe('101st'));
    it('111 -> 111th', () => expect(service.toOrdinal(111)).toBe('111th'));
    it('112 -> 112th', () => expect(service.toOrdinal(112)).toBe('112th'));
    it('113 -> 113th', () => expect(service.toOrdinal(113)).toBe('113th'));
    it('121 -> 121st', () => expect(service.toOrdinal(121)).toBe('121st'));
  });

  describe('toOrdinalId', () => {
    it('1 -> ke-1', () => expect(service.toOrdinalId(1)).toBe('ke-1'));
    it('2 -> ke-2', () => expect(service.toOrdinalId(2)).toBe('ke-2'));
    it('126 -> ke-126', () => expect(service.toOrdinalId(126)).toBe('ke-126'));
    it('1000 -> ke-1000', () => expect(service.toOrdinalId(1000)).toBe('ke-1000'));
  });

  describe('null-safe behavior', () => {
    it('handles null membercount for ordinal', () => {
      const result = service.render('{membercount.ordinal}', {});
      expect(result).toBe('{membercount.ordinal}');
    });

    it('handles undefined membercount for ordinal', () => {
      const result = service.render('{membercount.ordinal}', { membercount: undefined });
      expect(result).toBe('{membercount.ordinal}');
    });
  });
});
