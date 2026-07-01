import type { EmbedBuilder } from 'discord.js';
import type { CommandContext } from '../types/command.js';
import { Response } from '../responses/response.factory.js';
import type { ResponseOptions } from '../responses/response.factory.js';

export abstract class BaseCommand {
  abstract execute(ctx: CommandContext): Promise<void>;

  protected success(ctx: CommandContext, opts?: ResponseOptions): Promise<void> {
    return Response.success(ctx, opts);
  }

  protected error(ctx: CommandContext, opts?: ResponseOptions): Promise<void> {
    return Response.error(ctx, opts);
  }

  protected warning(ctx: CommandContext, opts?: ResponseOptions): Promise<void> {
    return Response.warning(ctx, opts);
  }

  protected info(ctx: CommandContext, opts?: ResponseOptions): Promise<void> {
    return Response.info(ctx, opts);
  }

  protected custom(
    ctx: CommandContext,
    opts: ResponseOptions & { build?: (embed: EmbedBuilder) => EmbedBuilder },
  ): Promise<void> {
    return Response.custom(ctx, opts);
  }
}
