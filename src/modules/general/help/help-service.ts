import type { CommandContext } from '../../../shared/types/command.js';
import type { CommandIndexer } from './command-indexer.js';
import { HelpComponentBuilder } from './help-component-builder.js';
import { HelpEmbedBuilder } from './help-embed-builder.js';

export class HelpService {
  readonly indexer: CommandIndexer;
  readonly embeds: HelpEmbedBuilder;
  readonly components = new HelpComponentBuilder();

  constructor(indexer: CommandIndexer, prefix: string, version: string) {
    this.indexer = indexer;
    this.embeds = new HelpEmbedBuilder(indexer, prefix, version);
  }

  async show(ctx: CommandContext, query?: string): Promise<void> {
    if (query) {
      const command = this.indexer.find(query);
      await ctx.reply({
        embeds: [command && this.indexer.visible(command, ctx) ? this.embeds.command(command) : this.embeds.notFound(query)],
        components: this.components.navigation(command?.category ?? ''),
      });
      return;
    }
    await ctx.reply({
      embeds: [this.embeds.home(ctx.user.client.user?.displayAvatarURL())],
      components: this.components.home(this.indexer.categories()),
    });
  }
}
