import type { ColorResolvable } from 'discord.js';
import { COLORS } from '../../shared/constants/colors.js';

export const VOICE_LOG_ACTIONS = {
  JOIN: 'join',
  LEAVE: 'leave',
  MOVE: 'move',
} as const;

export type VoiceLogAction = (typeof VOICE_LOG_ACTIONS)[keyof typeof VOICE_LOG_ACTIONS];

export type VoiceLogChannelFields = 'current' | 'previous' | 'transition';

export interface VoiceLogPresentation {
  emoji: string;
  label: string;
  color: ColorResolvable;
  footer: string;
  channelFields: VoiceLogChannelFields;
}

export const VOICE_LOG_PRESENTATION = {
  [VOICE_LOG_ACTIONS.JOIN]: {
    emoji: '<:in:1525849461207863409>',
    label: 'Voice Channel Join',
    color: COLORS.VOICE.JOIN,
    footer: 'Voice Join',
    channelFields: 'current',
  },
  [VOICE_LOG_ACTIONS.LEAVE]: {
    emoji: '<:out:1525849494892052612>',
    label: 'Voice Channel Leave',
    color: COLORS.VOICE.LEAVE,
    footer: 'Voice Leave',
    channelFields: 'previous',
  },
  [VOICE_LOG_ACTIONS.MOVE]: {
    emoji: '<:move:1525849532363968724>',
    label: 'Voice Channel Move',
    color: COLORS.VOICE.MOVE,
    footer: 'Voice Move',
    channelFields: 'transition',
  },
} as const satisfies Record<VoiceLogAction, VoiceLogPresentation>;
