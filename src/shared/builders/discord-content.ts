export const DISCORD_MESSAGE_LIMIT = 2000;

export const DISCORD_EMBED_LIMITS = {
  title: 256,
  description: 4096,
  fieldName: 256,
  fieldValue: 1024,
  footer: 2048,
} as const;

export function truncateDiscordText(value: string, limit: number, suffix = '…'): string {
  if (limit <= 0) return '';
  if (value.length <= limit) return value;
  if (suffix.length >= limit) return suffix.slice(0, limit);

  const available = limit - suffix.length;
  let result = '';
  for (const character of value) {
    if (result.length + character.length > available) break;
    result += character;
  }
  return result + suffix;
}

export function neutralizeMassMentions(value: string): string {
  return value.replace(/@(everyone|here)/gi, '@\u200b$1');
}

export function discordLogContent(value: string, limit = DISCORD_EMBED_LIMITS.fieldValue): string {
  return truncateDiscordText(neutralizeMassMentions(value), limit);
}
