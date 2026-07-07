import type { APIErrorCode, APIErrorResponse } from './types.js';

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

export class APIError extends Error {
  readonly status: number;

  constructor(
    readonly code: APIErrorCode,
    message: string,
    readonly details?: Record<string, unknown>,
    status = STATUS_BY_CODE[code],
  ) {
    super(message);
    this.name = 'APIError';
    this.status = status;
  }
}

export function apiError(code: APIErrorCode, message: string, details?: Record<string, unknown>): APIError {
  return new APIError(code, message, details);
}

export function toAPIErrorResponse(error: unknown): APIErrorResponse {
  if (error instanceof APIError) {
    return {
      success: false,
      status: error.status,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    };
  }

  return {
    success: false,
    status: STATUS_BY_CODE.INTERNAL_ERROR,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
    },
  };
}
