import type {
  APIResponse,
  GetManifestsResponse,
  GetMetadataResponse,
  GetModulesResponse,
  GetSettingsResponse,
  PatchSettingsResponse,
} from '../contracts.js';

export class DashboardAPIError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'DashboardAPIError';
  }
}

export interface APIClientOptions {
  baseUrl?: string;
  fetcher?: typeof fetch;
}

const DEFAULT_API_BASE_URL = '/api/v1';

export class APIClient {
  private readonly baseUrl: string;
  private readonly fetcher: typeof fetch;

  constructor(options: APIClientOptions = {}) {
    this.baseUrl = resolveAPIBaseUrl(options.baseUrl);
    this.fetcher = options.fetcher ?? fetch;
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PATCH', path, body);
  }

  delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }

  getManifests(): Promise<GetManifestsResponse> {
    return this.get<GetManifestsResponse>('/modules');
  }

  getGuildModules(guildId: string): Promise<GetModulesResponse> {
    return this.get<GetModulesResponse>(`/guilds/${encodeURIComponent(guildId)}/modules`);
  }

  getModuleSettings(moduleId: string): Promise<GetMetadataResponse> {
    return this.get<GetMetadataResponse>(`/modules/${encodeURIComponent(moduleId)}/settings`);
  }

  getGuildSettings(guildId: string): Promise<GetSettingsResponse> {
    return this.get<GetSettingsResponse>(`/guilds/${encodeURIComponent(guildId)}/settings`);
  }

  patchGuildSettings(guildId: string, settings: Record<string, unknown>): Promise<PatchSettingsResponse> {
    return this.patch<PatchSettingsResponse>(`/guilds/${encodeURIComponent(guildId)}/settings`, { settings });
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    let response: Response;
    try {
      response = await this.fetcher(`${this.baseUrl}${path}`, {
        method,
        headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (error) {
      throw new DashboardAPIError(
        error instanceof Error ? error.message : 'Backend is offline or unreachable',
        'NETWORK_ERROR',
        0,
      );
    }

    const payload = (await response.json().catch(() => ({
      success: false,
      error: { code: 'INVALID_RESPONSE', message: 'Backend returned an invalid response.' },
    }))) as APIResponse<T>;

    if (!response.ok || !payload.success) {
      throw new DashboardAPIError(
        payload.error?.message ?? 'Request failed',
        payload.error?.code ?? 'UNKNOWN_ERROR',
        response.status,
        payload.error?.details,
      );
    }

    return payload.data as T;
  }
}

function resolveAPIBaseUrl(baseUrl?: string): string {
  const configured = baseUrl ?? import.meta.env.VITE_API_BASE_URL;
  const resolved = configured?.trim() || DEFAULT_API_BASE_URL;

  return resolved.replace(/\/+$/, '');
}
