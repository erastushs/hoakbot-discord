import type {
  DiscordAPIClient,
  DiscordGuildResponse,
  DiscordOAuthConfig,
  DiscordTokenResponse,
  DiscordUserResponse,
} from './oauth.types.js';
import type { ILogger } from '../../logger/logger.service.js';

const DEFAULT_TOKEN_URL = 'https://discord.com/api/oauth2/token';
const DEFAULT_API_BASE_URL = 'https://discord.com/api/v10';

export class FetchDiscordAPIClient implements DiscordAPIClient {
  private readonly tokenUrl: string;
  private readonly apiBaseUrl: string;

  constructor(
    private readonly config: DiscordOAuthConfig,
    private readonly logger?: ILogger,
  ) {
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

    return parseDiscordTokenResponse<DiscordTokenResponse>(response, 'Discord token exchange failed.', this.logger);
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

async function parseDiscordTokenResponse<T>(response: Response, message: string, logger?: ILogger): Promise<T> {
  const bodyText = await response.text();

  if (!response.ok) {
    logger?.warn(
      {
        status: response.status,
        discordResponseBody: bodyText,
        oauthErrorCode: parseOAuthErrorField(bodyText, 'error'),
        oauthErrorDescription: parseOAuthErrorField(bodyText, 'error_description'),
      },
      'Discord OAuth token exchange failed',
    );
    throw new Error(message);
  }

  return JSON.parse(bodyText) as T;
}

async function parseDiscordResponse<T>(response: Response, message: string): Promise<T> {
  if (!response.ok) {
    throw new Error(message);
  }

  return (await response.json()) as T;
}

function parseOAuthErrorField(bodyText: string, field: 'error' | 'error_description'): string | undefined {
  try {
    const parsed = JSON.parse(bodyText) as Record<string, unknown>;
    const value = parsed[field];
    return typeof value === 'string' ? value : undefined;
  } catch {
    return undefined;
  }
}
