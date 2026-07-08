import type {
  APIResponse,
  CsrfResponse,
  GetManifestsResponse,
  GetMetadataResponse,
  GetModulesResponse,
  GetSettingsResponse,
  LogoutResponse,
  MeResponse,
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
const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export class APIClient {
  private readonly baseUrl: string;
  private readonly fetcher: typeof fetch;
  private csrfToken: string | undefined;

  constructor(options: APIClientOptions = {}) {
    this.baseUrl = resolveAPIBaseUrl(options.baseUrl);
    this.fetcher = options.fetcher ?? globalThis.fetch.bind(globalThis);
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PUT', path, body);
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

  getMe(): Promise<MeResponse> {
    return this.get<MeResponse>('/me');
  }

  async bootstrapSession(): Promise<MeResponse> {
    const me = await this.getMe();
    if (me.authenticationState === 'authenticated') {
      const csrf = await this.get<CsrfResponse>('/csrf');
      this.csrfToken = csrf.csrfToken;
    } else {
      this.csrfToken = undefined;
    }

    return me;
  }

  logout(): Promise<LogoutResponse> {
    return this.post<LogoutResponse>('/logout').finally(() => {
      this.csrfToken = undefined;
    });
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
    const url = `${this.baseUrl}${path}`;
    debugDashboardAPI('[dashboard-api] request:start', { method, path, url });

    let response: Response;
    try {
      debugDashboardAPI('[dashboard-api] fetch:execute', { method, url });
      response = await this.fetcher(url, {
        method,
        credentials: 'include',
        headers: this.requestHeaders(method, body),
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      debugDashboardAPI('[dashboard-api] response:status', { method, url, status: response.status });
    } catch (error) {
      debugDashboardAPI('[dashboard-api] request:throw', { method, url, error });
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
    debugDashboardAPI('[dashboard-api] response:json', { method, url, payload: path === '/csrf' ? '[redacted]' : payload });

    if (!response.ok || !payload.success) {
      debugDashboardAPI('[dashboard-api] request:throw', { method, url, status: response.status, payload });
      throw new DashboardAPIError(
        payload.error?.message ?? 'Request failed',
        payload.error?.code ?? 'UNKNOWN_ERROR',
        response.status,
        payload.error?.details,
      );
    }

    return payload.data as T;
  }

  private requestHeaders(method: string, body: unknown): Record<string, string> | undefined {
    const headers: Record<string, string> = {};
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    if (STATE_CHANGING_METHODS.has(method) && this.csrfToken) {
      headers['X-CSRF-Token'] = this.csrfToken;
    }

    return Object.keys(headers).length > 0 ? headers : undefined;
  }
}

function resolveAPIBaseUrl(baseUrl?: string): string {
  const configured = baseUrl ?? import.meta.env.VITE_API_BASE_URL;
  const resolved = configured?.trim() || DEFAULT_API_BASE_URL;

  const normalized = resolved.replace(/\/+$/, '');
  debugDashboardAPI('[dashboard-api] resolveAPIBaseUrl', {
    explicitBaseUrl: baseUrl,
    envBaseUrl: import.meta.env.VITE_API_BASE_URL,
    resolvedBaseUrl: normalized,
  });

  return normalized;
}

function debugDashboardAPI(message: string, details: Record<string, unknown>): void {
  if (import.meta.env.DEV) {
    globalThis.console.debug(message, details);
  }
}
