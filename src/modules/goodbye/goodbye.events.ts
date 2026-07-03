export interface MemberLeftEvent {
  guildId: string;
  userId: string;
  memberCount: number;
}

export interface GoodbyeEventMap {
  'member.left': MemberLeftEvent;
}
