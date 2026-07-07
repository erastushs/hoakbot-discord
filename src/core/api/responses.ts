import type { APIErrorCode, APIErrorResponse, APIPaginationMeta, APISuccessResponse } from './types.js';

const STATUS_BY_CODE: Record<APIErrorCode, number> = {
  AUTH_REQUIRED: 401,
  AUTH_EXPIRED: 401,
  FORBIDDEN: 403,
  GUILD_NOT_FOUND: 404,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 422,
  RATE_LIMITED: 429,
  CONFLICT: 409,
  INVALID_CSRF: 403,
  INTERNAL_ERROR: 500,
};

export function ok<T>(data: T, status = 200): APISuccessResponse<T> {
  return { success: true, data, status };
}

export function paginated<T>(data: T, meta: APIPaginationMeta): APISuccessResponse<T> {
  return { success: true, data, meta, status: 200 };
}

export function noContent(): APISuccessResponse<null> {
  return { success: true, data: null, status: 204 };
}

export function fail(
  code: APIErrorCode,
  message: string,
  details?: Record<string, unknown>,
  status = STATUS_BY_CODE[code],
): APIErrorResponse {
  return {
    success: false,
    status,
    error: { code, message, details },
  };
}
