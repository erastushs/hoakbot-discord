import { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } from 'discord.js';
import type { HelpCategory } from './command-indexer.js';

export const HELP_IDS = {
  category: 'help:v2:category',
  home: 'help:v2:home',
  back: 'help:v2:back',
} as const;

export class HelpComponentBuilder {
  home(categories: readonly HelpCategory[]): ActionRowBuilder<StringSelectMenuBuilder>[] {
    const pages: ActionRowBuilder<StringSelectMenuBuilder>[] = [];
    for (let offset = 0; offset < categories.length; offset += 25) {
      pages.push(
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(`${HELP_IDS.category}:${offset / 25}`)
            .setPlaceholder('Select a command category')
            .addOptions(
              categories.slice(offset, offset + 25).map((category) => ({
                label: category.name,
                value: category.name,
                description: `${category.commands.length} command${category.commands.length === 1 ? '' : 's'}`,
              })),
            ),
        ),
      );
    }
    return pages.slice(0, 5);
  }

  navigation(category?: string): ActionRowBuilder<ButtonBuilder>[] {
    return [
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(category ? `${HELP_IDS.back}:${category}` : HELP_IDS.back)
          .setLabel('Back')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(HELP_IDS.home).setLabel('Home').setStyle(ButtonStyle.Primary),
      ),
    ];
  }
}
