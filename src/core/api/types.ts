import type { ZodTypeAny } from 'zod';

export type APIHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type APIAuthLevel = 'public' | 'authenticated' | 'guild_member' | 'guild_admin' | 'bot_owner';

export interface APIPaginationMeta {
  page: number;
  pageSize: number;
  total: number;
}

export interface APISuccessResponse<T = unknown> {
  success: true;
  data: T;
  meta?: APIPaginationMeta;
  status?: number;
}

export interface APIErrorBody {
  code: APIErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

export interface APIErrorResponse {
  success: false;
  error: APIErrorBody;
  status: number;
}

export type APIResponse<T = unknown> = APISuccessResponse<T> | APIErrorResponse;

export type APIErrorCode =
  | 'AUTH_REQUIRED'
  | 'AUTH_EXPIRED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMITED'
  | 'CONFLICT'
  | 'INTERNAL_ERROR';

export interface APIRequest {
  method: APIHttpMethod;
  path: string;
  headers?: Record<string, string | undefined>;
  params?: Record<string, string>;
  query?: Record<string, unknown>;
  body?: unknown;
}

export interface APIRequestContext {
  requestId: string;
  startedAt: number;
  version: 'v1';
  params: Record<string, string>;
}

export type APINext = () => Promise<APIResponse>;
export type APIMiddleware = (request: APIRequest, context: APIRequestContext, next: APINext) => Promise<APIResponse>;
export type APIHandler<T = unknown> = (request: APIRequest, context: APIRequestContext) => Promise<APIResponse<T>>;

export interface APIRateLimit {
  window: number;
  max: number;
}

export interface APIOperationMetadata {
  operationId: string;
  tags: string[];
  summary?: string;
  description?: string;
}

export interface APIEndpoint<T = unknown> {
  module: string;
  method: APIHttpMethod;
  path: string;
  handler: APIHandler<T>;
  auth: APIAuthLevel;
  params?: ZodTypeAny;
  query?: ZodTypeAny;
  body?: ZodTypeAny;
  rateLimit?: APIRateLimit;
  middleware?: APIMiddleware[];
  metadata: APIOperationMetadata;
}

export interface APIRegisteredRoute<T = unknown> {
  endpoint: APIEndpoint<T>;
  fullPath: string;
}
