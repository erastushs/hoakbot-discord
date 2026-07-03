import { PlaceholderRegistry } from './placeholder-registry.js';
import { FormatterRegistry } from './formatter-registry.js';

export interface TemplateContext {
  user?: string;
  mention?: string;
  username?: string;
  display_name?: string;
  server?: string;
  membercount?: number;
  created?: string;
  joined?: string;
}

export class TemplateService {
  private readonly placeholderRegistry: PlaceholderRegistry;
  private readonly formatterRegistry: FormatterRegistry;

  constructor(
    placeholderRegistry?: PlaceholderRegistry,
    formatterRegistry?: FormatterRegistry,
  ) {
    this.placeholderRegistry = placeholderRegistry ?? new PlaceholderRegistry();
    this.formatterRegistry = formatterRegistry ?? new FormatterRegistry();
  }

  getPlaceholderRegistry(): PlaceholderRegistry {
    return this.placeholderRegistry;
  }

  getFormatterRegistry(): FormatterRegistry {
    return this.formatterRegistry;
  }

  render(template: string, context: TemplateContext): string {
    return template.replace(/\{(\w+)(?:\.(\w+))?\}/g, (_match, key: string, formatter?: string) => {
      const resolved = this.resolvePlaceholder(key, formatter, context);
      return resolved ?? _match;
    });
  }

  renderLines(lines: string[], context: TemplateContext): string[] {
    return lines.map((line) => this.render(line, context));
  }

  toOrdinal(n: number): string {
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) return String(n);

    const last = n % 10;
    const lastTwo = n % 100;

    if (lastTwo >= 11 && lastTwo <= 13) return `${n}th`;

    switch (last) {
      case 1:
        return `${n}st`;
      case 2:
        return `${n}nd`;
      case 3:
        return `${n}rd`;
      default:
        return `${n}th`;
    }
  }

  toOrdinalId(n: number): string {
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) return String(n);
    return `ke-${n}`;
  }

  private resolvePlaceholder(key: string, formatter: string | undefined, context: TemplateContext): string | null {
    if (!this.placeholderRegistry.get(key)) return null;

    const value = this.resolveValue(key, context);
    if (value === null) return null;

    if (formatter) {
      if (!this.formatterRegistry.has(formatter)) return null;
      return this.formatterRegistry.format(value, formatter);
    }

    return value;
  }

  private resolveValue(key: string, context: TemplateContext): string | null {
    switch (key) {
      case 'user':
        return context.user ?? null;
      case 'mention':
        return context.mention ?? null;
      case 'username':
        return context.username ?? null;
      case 'display_name':
        return context.display_name ?? null;
      case 'server':
        return context.server ?? null;
      case 'membercount':
        return context.membercount !== undefined ? String(context.membercount) : null;
      case 'created':
        return context.created ?? null;
      case 'joined':
        return context.joined ?? null;
      default:
        return null;
    }
  }
}
