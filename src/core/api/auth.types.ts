export interface Identity {
  id: string;
  username: string;
  avatar?: string;
}

export interface Session {
  id: string;
  identity: Identity;
  expiresAt: number;
  createdAt: number;
}

export interface GuildMembership {
  guildId: string;
  owner: boolean;
  permissions: string[];
  roles: string[];
}

export interface UserContext {
  identity: Identity;
  session: Session;
  guilds: GuildMembership[];
  isBotOwner?: boolean;
}

export interface AuthProvider {
  createSession(identity: Identity, expiresAt: number): Promise<Session>;
  getSession(sessionId: string): Promise<Session | undefined>;
  destroySession(sessionId: string): Promise<void>;
  getUserContext(session: Session): Promise<UserContext>;
}
