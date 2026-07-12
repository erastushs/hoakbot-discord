import { describe, expect, it } from 'vitest';
import { EmbedFactory } from '../../src/shared/builders/embed.factory.js';
import { discordLogContent, neutralizeMassMentions, truncateDiscordText } from '../../src/shared/builders/discord-content.js';

describe('Discord embed content primitives', () => {
  it('preserves text at the exact limit', () => {
    expect(truncateDiscordText('a'.repeat(256), 256)).toBe('a'.repeat(256));
  });

  it('truncates to the exact UTF-16 limit without splitting surrogate pairs', () => {
    const result = truncateDiscordText('a'.repeat(1021) + '😀more', 1024);
    expect(result.length).toBe(1024);
    expect(result).toBe('a'.repeat(1021) + '😀…');
    expect(result).not.toContain('\ud83d…');
  });

  it('neutralizes mass mentions case-insensitively while preserving user mentions', () => {
    expect(neutralizeMassMentions('@everyone @HERE <@123>')).toBe('@\u200beveryone @\u200bHERE <@123>');
  });

  it('sanitizes before truncating log content', () => {
    const result = discordLogContent('@everyone ' + '😀'.repeat(600));
    expect(result.length).toBeLessThanOrEqual(1024);
    expect(result.startsWith('@\u200beveryone ')).toBe(true);
    expect(result.endsWith('…')).toBe(true);
  });

  it('applies every Discord embed component limit and timestamp variant', () => {
    const embed = EmbedFactory.build({
      title: '😀'.repeat(200),
      description: 'd'.repeat(5000),
      fields: [{ name: 'n'.repeat(300), value: 'v'.repeat(1200) }],
      footer: 'f'.repeat(2200),
      timestamp: false,
    }).toJSON();

    expect(embed.title?.length).toBeLessThanOrEqual(256);
    expect(embed.description?.length).toBe(4096);
    expect(embed.fields?.[0]?.name.length).toBe(256);
    expect(embed.fields?.[0]?.value.length).toBe(1024);
    expect(embed.footer?.text.length).toBe(2048);
    expect(embed.timestamp).toBeUndefined();
    expect(EmbedFactory.build({}).toJSON().timestamp).toBeDefined();
  });
});
