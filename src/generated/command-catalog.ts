import type { BuiltinCommandFactory } from '../shared/command/builtin-commands.js';
import { AvatarCommand as Command0 } from '../modules/general/commands/avatar.command.js';
import { BotInfoCommand as Command1 } from '../modules/general/commands/botinfo.command.js';
import { HelpCommand as Command2 } from '../modules/general/commands/help.command.js';
import { PingCommand as Command3 } from '../modules/general/commands/ping.command.js';
import { ServerInfoCommand as Command4 } from '../modules/general/commands/serverinfo.command.js';
import { UserInfoCommand as Command5 } from '../modules/general/commands/userinfo.command.js';
import { BanCommand as Command6 } from '../modules/moderation/commands/ban.command.js';
import { CleanCommand as Command7 } from '../modules/moderation/commands/clean.command.js';
import { KickCommand as Command8 } from '../modules/moderation/commands/kick.command.js';
import { TimeoutCommand as Command9 } from '../modules/moderation/commands/timeout.command.js';
import { WarnClearCommand as Command10 } from '../modules/moderation/commands/warn-clear.command.js';
import { WarnRemoveCommand as Command11 } from '../modules/moderation/commands/warn-remove.command.js';
import { WarnCommand as Command12 } from '../modules/moderation/commands/warn.command.js';
import { WarningsCommand as Command13 } from '../modules/moderation/commands/warnings.command.js';

export const createCommand0: BuiltinCommandFactory = (_dependencies) => new Command0();
export const createCommand1: BuiltinCommandFactory = (dependencies) => new Command1(dependencies.config);
export const createCommand2: BuiltinCommandFactory = (dependencies) => new Command2(dependencies.helpService);
export const createCommand3: BuiltinCommandFactory = (_dependencies) => new Command3();
export const createCommand4: BuiltinCommandFactory = (_dependencies) => new Command4();
export const createCommand5: BuiltinCommandFactory = (_dependencies) => new Command5();
export const createCommand6: BuiltinCommandFactory = (dependencies) => new Command6(dependencies.metrics);
export const createCommand7: BuiltinCommandFactory = (_dependencies) => new Command7();
export const createCommand8: BuiltinCommandFactory = (dependencies) => new Command8(dependencies.metrics);
export const createCommand9: BuiltinCommandFactory = (dependencies) => new Command9(dependencies.metrics);
export const createCommand10: BuiltinCommandFactory = (dependencies) => new Command10(dependencies.warningService);
export const createCommand11: BuiltinCommandFactory = (dependencies) => new Command11(dependencies.warningService);
export const createCommand12: BuiltinCommandFactory = (dependencies) => new Command12(dependencies.warningService);
export const createCommand13: BuiltinCommandFactory = (dependencies) => new Command13(dependencies.warningService);

export const builtinCommandCatalog = Object.freeze([
  Object.freeze({ source: 'src/modules/general/commands/avatar.command.ts', owner: 'builtin.general', create: createCommand0 }),
  Object.freeze({ source: 'src/modules/general/commands/botinfo.command.ts', owner: 'builtin.general', create: createCommand1 }),
  Object.freeze({ source: 'src/modules/general/commands/help.command.ts', owner: 'builtin.general', create: createCommand2 }),
  Object.freeze({ source: 'src/modules/general/commands/ping.command.ts', owner: 'builtin.general', create: createCommand3 }),
  Object.freeze({ source: 'src/modules/general/commands/serverinfo.command.ts', owner: 'builtin.general', create: createCommand4 }),
  Object.freeze({ source: 'src/modules/general/commands/userinfo.command.ts', owner: 'builtin.general', create: createCommand5 }),
  Object.freeze({ source: 'src/modules/moderation/commands/ban.command.ts', owner: 'builtin.moderation', create: createCommand6 }),
  Object.freeze({ source: 'src/modules/moderation/commands/clean.command.ts', owner: 'builtin.moderation', create: createCommand7 }),
  Object.freeze({ source: 'src/modules/moderation/commands/kick.command.ts', owner: 'builtin.moderation', create: createCommand8 }),
  Object.freeze({ source: 'src/modules/moderation/commands/timeout.command.ts', owner: 'builtin.moderation', create: createCommand9 }),
  Object.freeze({ source: 'src/modules/moderation/commands/warn-clear.command.ts', owner: 'builtin.moderation', create: createCommand10 }),
  Object.freeze({ source: 'src/modules/moderation/commands/warn-remove.command.ts', owner: 'builtin.moderation', create: createCommand11 }),
  Object.freeze({ source: 'src/modules/moderation/commands/warn.command.ts', owner: 'builtin.moderation', create: createCommand12 }),
  Object.freeze({ source: 'src/modules/moderation/commands/warnings.command.ts', owner: 'builtin.moderation', create: createCommand13 }),
] as const);
export const builtinCommandFiles = Object.freeze(builtinCommandCatalog.map(({ source }) => source));
export const builtinCommandCatalogHash = 'bc615de2264e86649801410c386911252ff965507a0dccc07fd467257a4cd8f4';
