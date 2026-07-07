import type { AuthenticatedUser, GuildIdentity } from '../auth.types.js';

export interface DiscordOAuthConfig {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly redirectUri: string;
  readonly authorizationBaseUrl?: string;
  readonly tokenUrl?: string;
  readonly apiBaseUrl?: string;
}

export interface DiscordTokenResponse {
  readonly access_token: string;
  readonly token_type: string;
  readonly expires_in?: number;
  readonly refresh_token?: string;
  readonly scope?: string;
}

export interface DiscordUserResponse {
  readonly id: string;
  readonly username: string;
  readonly global_name?: string | null;
  readonly avatar?: string | null;
}

export interface DiscordGuildResponse {
  readonly id: string;
  readonly name: string;
  readonly icon?: string | null;
  readonly owner?: boolean;
  readonly permissions?: string;
}

export interface DiscordOAuthIdentity {
  readonly user: AuthenticatedUser;
  readonly guilds: readonly GuildIdentity[];
}

export interface DiscordAPIClient {
  exchangeCode(code: string): Promise<DiscordTokenResponse>;
  getCurrentUser(accessToken: string): Promise<DiscordUserResponse>;
  getCurrentUserGuilds(accessToken: string): Promise<DiscordGuildResponse[]>;
}
