export interface VoiceMemberJoinedEvent {
  guildId: string;
  userId: string;
  username: string;
  channelId: string;
  channelName: string;
  joinedAt: number;
}

export interface VoiceSoundPlayedEvent {
  guildId: string;
  channelId: string;
  soundId: string;
  soundName: string;
}

export interface VoiceConnectionLostEvent {
  guildId: string;
}

export interface VoiceConnectionRestoredEvent {
  guildId: string;
}

export interface VoiceEventMap {
  'voice.memberJoined': VoiceMemberJoinedEvent;
  'voice.soundPlayed': VoiceSoundPlayedEvent;
  'voice.connectionLost': VoiceConnectionLostEvent;
  'voice.connectionRestored': VoiceConnectionRestoredEvent;
}
