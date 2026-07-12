import type { ButtonInteraction, StringSelectMenuInteraction } from 'discord.js';
import type { HelpService } from './help-service.js';
import { HELP_IDS } from './help-component-builder.js';

export class HelpInteractionHandler {
  constructor(private readonly service: HelpService) {}

  owns(customId: string): boolean {
    return (
      customId === HELP_IDS.home ||
      customId === HELP_IDS.back ||
      customId.startsWith(`${HELP_IDS.category}:`) ||
      customId.startsWith(`${HELP_IDS.back}:`)
    );
  }

  async handle(interaction: ButtonInteraction | StringSelectMenuInteraction): Promise<void> {
    if (!this.owns(interaction.customId)) return;
    if (interaction.isStringSelectMenu()) {
      const category = this.service.indexer.categories().find((entry) => entry.name === interaction.values[0]);
      if (!category) return void (await interaction.deferUpdate());
      await interaction.update({
        embeds: [this.service.embeds.category(category)],
        components: this.service.components.navigation(),
      });
      return;
    }
    if (interaction.customId.startsWith(`${HELP_IDS.back}:`)) {
      const categoryName = interaction.customId.slice(`${HELP_IDS.back}:`.length);
      const category = this.service.indexer.categories().find((entry) => entry.name === categoryName);
      if (category) {
        await interaction.update({
          embeds: [this.service.embeds.category(category)],
          components: this.service.components.navigation(),
        });
        return;
      }
    }
    await interaction.update({
      embeds: [this.service.embeds.home(interaction.client.user.displayAvatarURL())],
      components: this.service.components.home(this.service.indexer.categories()),
    });
  }
}
