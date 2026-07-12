import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import type { ICommand } from '../../../shared/types/command.js';
import type { CommandIndexer, HelpCategory } from './command-indexer.js';

const permissionNames = new Map<bigint, string>(
  Object.entries(PermissionFlagsBits).map(([name, value]) => [value, name.replace(/([a-z])([A-Z])/g, '$1 $2')]),
);

export class HelpEmbedBuilder {
  constructor(
    private readonly indexer: CommandIndexer,
    private readonly prefix: string,
    private readonly version: string,
  ) {}

  home(avatar?: string): EmbedBuilder {
    const categories = this.indexer.categories();
    return new EmbedBuilder()
      .setTitle('📚 Hoak Bot Help')
      .setDescription(
        `Use the menu below to browse commands.\n\n**Total Commands:** ${this.indexer.commands().length}\n**Categories:** ${categories.length}\n**Version:** ${this.version}`,
      )
      .setThumbnail(avatar ?? null);
  }

  category(category: HelpCategory): EmbedBuilder {
    return new EmbedBuilder().setTitle(`${category.name} Commands`).setDescription(
      category.commands
        .map(
          (command) =>
            `**/${command.name}** · **${this.prefix}${command.name}**\n${command.description}\nPermissions: ${this.permissions(command)}`,
        )
        .join('\n\n'),
    );
  }

  command(command: ICommand): EmbedBuilder {
    const json = command.slashOptions?.toJSON();
    const options = json?.options ?? [];
    const usage = options
      .map((option) => `${'required' in option && option.required ? '<' : '['}${option.name}${'required' in option && option.required ? '>' : ']'}`)
      .join(' ');
    const invocation = `${this.prefix}${command.name}${usage ? ` ${usage}` : ''}`;
    return new EmbedBuilder().setTitle(`/${command.name}`).setDescription(command.description).addFields(
      { name: 'Usage', value: `\`/${command.name}${usage ? ` ${usage}` : ''}\`\n\`${invocation}\`` },
      { name: 'Examples', value: `\`/${command.name}\`\n\`${this.prefix}${command.name}\`` },
      { name: 'Aliases', value: command.prefixAliases?.join(', ') || 'None', inline: true },
      { name: 'Permissions', value: this.permissions(command), inline: true },
      { name: 'Category', value: command.category, inline: true },
    );
  }

  notFound(name: string): EmbedBuilder {
    return new EmbedBuilder().setTitle('Command not found').setDescription(`No visible command named \`${name}\` was found.`);
  }

  private permissions(command: ICommand): string {
    return command.requiredPermissions?.map((permission) => permissionNames.get(permission) ?? permission.toString()).join(', ') || 'None';
  }
}
