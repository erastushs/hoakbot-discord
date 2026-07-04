import type { APIResponse } from '../contracts.js';

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

export class APIClient {
  private readonly baseUrl: string;
  private readonly fetcher: typeof fetch;

  constructor(options: APIClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? '/api/v1';
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

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const response = await this.fetcher(`${this.baseUrl}${path}`, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const payload = (await response.json()) as APIResponse<T>;

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
