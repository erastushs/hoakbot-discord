export interface MemberJoinedEvent {
  guildId: string;
  userId: string;
  memberCount: number;
}

export interface WelcomeEventMap {
  'member.joined': MemberJoinedEvent;
}
