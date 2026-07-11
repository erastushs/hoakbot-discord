import type { ConfigurationChangedEvent } from './configuration.events.js';
import type { CoreSystemEventMap } from './system.events.js';
import type { GeneralEventMap } from '../../modules/general/general.events.js';
import type { GoodbyeEventMap } from '../../modules/goodbye/goodbye.events.js';
import type { LoggingEventMap } from '../../modules/logging/logging.events.js';
import type { ModerationEventMap } from '../../modules/moderation/moderation.events.js';
import type { ShrineEventMap } from '../../modules/shrine/shrine.events.js';
import type { VoiceEventMap } from '../../modules/voice/voice.events.js';
import type { WelcomeEventMap } from '../../modules/welcome/welcome.events.js';

export type { BotErrorEvent, BotReadyEvent, ShutdownEvent } from './system.events.js';
export type {
  CommandExecutedEvent,
  CommandFailedEvent,
  CooldownBlockedEvent,
  PermissionDeniedEvent,
  SchedulerJobDueEvent,
} from '../../modules/general/general.events.js';
export type { MemberLeftEvent } from '../../modules/goodbye/goodbye.events.js';
export type {
  LoggingAttachmentsArchivedEvent,
  LoggingAvatarUpdatedEvent,
  LoggingDisplayNameUpdatedEvent,
  LoggingKickLoggedEvent,
  LoggingMessageBulkDeletedEvent,
  LoggingMessageDeletedEvent,
  LoggingMessageEditedEvent,
  LoggingModerationLoggedEvent,
  LoggingNicknameUpdatedEvent,
  LoggingRoleAddedEvent,
  LoggingRoleRemovedEvent,
} from '../../modules/logging/logging.events.js';
export type { ModerationActionEvent, WarningIssuedEvent } from '../../modules/moderation/moderation.events.js';
export type { ShrinePollFailedEvent, ShrineUpdatedEvent } from '../../modules/shrine/shrine.events.js';
export type {
  VoiceConnectionLostEvent,
  VoiceConnectionRestoredEvent,
  VoiceMemberJoinedEvent,
  VoiceSoundPlayedEvent,
} from '../../modules/voice/voice.events.js';
export type { MemberJoinedEvent } from '../../modules/welcome/welcome.events.js';

export interface EventMap
  extends CoreSystemEventMap,
    GeneralEventMap,
    WelcomeEventMap,
    GoodbyeEventMap,
    VoiceEventMap,
    ModerationEventMap,
    LoggingEventMap,
    ShrineEventMap {
  'configuration.changed': ConfigurationChangedEvent;
}
