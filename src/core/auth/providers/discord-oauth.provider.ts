import type { IAuthProvider } from '../auth-provider.interface.js';
import type {
  AuthCallbackRequest,
  AuthResult,
  AuthenticatedUser,
  GuildIdentity,
  LoginRequest,
  LoginStart,
} from '../auth.types.js';
import type { OAuthStateService } from './oauth-state.service.js';
import type {
  DiscordAPIClient,
  DiscordGuildResponse,
  DiscordOAuthConfig,
  DiscordUserResponse,
} from './oauth.types.js';

const DEFAULT_AUTHORIZATION_BASE_URL = 'https://discord.com/oauth2/authorize';
const DISCORD_SCOPES = ['identify', 'guilds'] as const;

export class DiscordOAuthProvider implements IAuthProvider {
  private readonly authorizationBaseUrl: string;

  constructor(
    private readonly config: DiscordOAuthConfig,
    private readonly stateService: OAuthStateService,
    private readonly discord: DiscordAPIClient,
  ) {
    this.authorizationBaseUrl = config.authorizationBaseUrl ?? DEFAULT_AUTHORIZATION_BASE_URL;
  }

  async beginLogin(request: LoginRequest = {}): Promise<LoginStart> {
    const state = this.stateService.createState(request.redirectPath);
    return {
      authorizationUrl: this.buildAuthorizationUrl(state.value),
      state,
    };
  }

  async handleCallback(request: AuthCallbackRequest): Promise<AuthResult> {
    if (request.error) {
      return {
        ok: false,
        code: 'auth.cancelled',
        message: request.errorDescription ?? request.error,
      };
    }

    if (!request.code) {
      return {
        ok: false,
        code: 'auth.invalid_callback',
        message: 'Discord OAuth callback did not include an authorization code.',
      };
    }

    const state = this.stateService.consumeState(request.state);
    if (!state) {
      return {
        ok: false,
        code: 'auth.invalid_state',
        message: 'Discord OAuth state is missing, expired, or already used.',
      };
    }

    try {
      const token = await this.discord.exchangeCode(request.code);
      const [discordUser, discordGuilds] = await Promise.all([
        this.discord.getCurrentUser(token.access_token),
        this.discord.getCurrentUserGuilds(token.access_token),
      ]);

      return {
        ok: true,
        user: mapUser(discordUser),
        guilds: discordGuilds.map(mapGuild),
      };
    } catch (error) {
      return {
        ok: false,
        code: 'auth.provider_error',
        message: error instanceof Error ? error.message : 'Discord OAuth provider failed.',
      };
    }
  }

  async getCurrentUser(): Promise<AuthenticatedUser | undefined> {
    return undefined;
  }

  async logout(): Promise<void> {
    // Session-backed logout belongs to Phase 3.
  }

  private buildAuthorizationUrl(state: string): string {
    const url = new URL(this.authorizationBaseUrl);
    url.searchParams.set('client_id', this.config.clientId);
    url.searchParams.set('redirect_uri', this.config.redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', DISCORD_SCOPES.join(' '));
    url.searchParams.set('state', state);
    return url.toString();
  }
}

function mapUser(user: DiscordUserResponse): AuthenticatedUser {
  return {
    id: user.id,
    provider: 'discord',
    username: user.username,
    displayName: user.global_name ?? user.username,
    avatarUrl: user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : undefined,
  };
}

function mapGuild(guild: DiscordGuildResponse): GuildIdentity {
  return {
    id: guild.id,
    name: guild.name,
    iconUrl: guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png` : undefined,
    owner: guild.owner,
    rawPermissions: guild.permissions,
  };
}
