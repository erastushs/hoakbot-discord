import type { AuthProvider, GuildMembership, Identity, Session, UserContext } from './auth.types.js';

let sessionCounter = 0;

export interface MemoryAuthProviderOptions {
  botOwnerIds?: string[];
  guildsByUserId?: Record<string, GuildMembership[]>;
}

export class MemoryAuthProvider implements AuthProvider {
  private readonly sessions = new Map<string, Session>();
  private readonly botOwnerIds: Set<string>;
  private readonly guildsByUserId: Record<string, GuildMembership[]>;

  constructor(options: MemoryAuthProviderOptions = {}) {
    this.botOwnerIds = new Set(options.botOwnerIds ?? []);
    this.guildsByUserId = options.guildsByUserId ?? {};
  }

  async createSession(identity: Identity, expiresAt: number): Promise<Session> {
    sessionCounter += 1;
    const session: Session = {
      id: `session-${sessionCounter}`,
      identity,
      expiresAt,
      createdAt: Date.now(),
    };

    this.sessions.set(session.id, session);
    return session;
  }

  async getSession(sessionId: string): Promise<Session | undefined> {
    const session = this.sessions.get(sessionId);
    if (!session || session.expiresAt <= Date.now()) {
      return undefined;
    }

    return session;
  }

  async destroySession(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }

  async getUserContext(session: Session): Promise<UserContext> {
    return {
      identity: session.identity,
      session,
      guilds: this.guildsByUserId[session.identity.id] ?? [],
      isBotOwner: this.botOwnerIds.has(session.identity.id),
    };
  }
}
