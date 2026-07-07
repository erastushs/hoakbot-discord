import type {
  DiscordAPIClient,
  DiscordGuildResponse,
  DiscordOAuthConfig,
  DiscordTokenResponse,
  DiscordUserResponse,
} from './oauth.types.js';

const DEFAULT_TOKEN_URL = 'https://discord.com/api/oauth2/token';
const DEFAULT_API_BASE_URL = 'https://discord.com/api/v10';

export class FetchDiscordAPIClient implements DiscordAPIClient {
  private readonly tokenUrl: string;
  private readonly apiBaseUrl: string;

  constructor(private readonly config: DiscordOAuthConfig) {
    this.tokenUrl = config.tokenUrl ?? DEFAULT_TOKEN_URL;
    this.apiBaseUrl = config.apiBaseUrl ?? DEFAULT_API_BASE_URL;
  }

  async exchangeCode(code: string): Promise<DiscordTokenResponse> {
    const body = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.config.redirectUri,
    });

    const response = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    return parseDiscordResponse<DiscordTokenResponse>(response, 'Discord token exchange failed.');
  }

  async getCurrentUser(accessToken: string): Promise<DiscordUserResponse> {
    const response = await fetch(`${this.apiBaseUrl}/users/@me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    return parseDiscordResponse<DiscordUserResponse>(response, 'Discord user retrieval failed.');
  }

  async getCurrentUserGuilds(accessToken: string): Promise<DiscordGuildResponse[]> {
    const response = await fetch(`${this.apiBaseUrl}/users/@me/guilds`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    return parseDiscordResponse<DiscordGuildResponse[]>(response, 'Discord guild retrieval failed.');
  }
}

async function parseDiscordResponse<T>(response: Response, message: string): Promise<T> {
  if (!response.ok) {
    throw new Error(message);
  }

  return (await response.json()) as T;
}
