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

export const builtinCommandCatalog = Object.freeze([
  Object.freeze({ source: 'src/modules/general/commands/avatar.command.ts', owner: 'builtin.general', factory: 'none', command: Command0 }),
  Object.freeze({ source: 'src/modules/general/commands/botinfo.command.ts', owner: 'builtin.general', factory: 'bot-info', command: Command1 }),
  Object.freeze({ source: 'src/modules/general/commands/help.command.ts', owner: 'builtin.general', factory: 'help', command: Command2 }),
  Object.freeze({ source: 'src/modules/general/commands/ping.command.ts', owner: 'builtin.general', factory: 'none', command: Command3 }),
  Object.freeze({ source: 'src/modules/general/commands/serverinfo.command.ts', owner: 'builtin.general', factory: 'none', command: Command4 }),
  Object.freeze({ source: 'src/modules/general/commands/userinfo.command.ts', owner: 'builtin.general', factory: 'none', command: Command5 }),
  Object.freeze({ source: 'src/modules/moderation/commands/ban.command.ts', owner: 'builtin.moderation', factory: 'ban', command: Command6 }),
  Object.freeze({ source: 'src/modules/moderation/commands/clean.command.ts', owner: 'builtin.moderation', factory: 'none', command: Command7 }),
  Object.freeze({ source: 'src/modules/moderation/commands/kick.command.ts', owner: 'builtin.moderation', factory: 'kick', command: Command8 }),
  Object.freeze({ source: 'src/modules/moderation/commands/timeout.command.ts', owner: 'builtin.moderation', factory: 'timeout', command: Command9 }),
  Object.freeze({ source: 'src/modules/moderation/commands/warn-clear.command.ts', owner: 'builtin.moderation', factory: 'warn-clear', command: Command10 }),
  Object.freeze({ source: 'src/modules/moderation/commands/warn-remove.command.ts', owner: 'builtin.moderation', factory: 'warn-remove', command: Command11 }),
  Object.freeze({ source: 'src/modules/moderation/commands/warn.command.ts', owner: 'builtin.moderation', factory: 'warn', command: Command12 }),
  Object.freeze({ source: 'src/modules/moderation/commands/warnings.command.ts', owner: 'builtin.moderation', factory: 'warnings', command: Command13 }),
] as const);
export const builtinCommandFiles = Object.freeze(builtinCommandCatalog.map(({ source }) => source));
export const builtinCommandCatalogHash = 'bc615de2264e86649801410c386911252ff965507a0dccc07fd467257a4cd8f4';
