import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { APIError, apiError, toAPIErrorResponse } from '../../src/core/api/errors.js';
import { fail, noContent, ok, paginated } from '../../src/core/api/responses.js';
import { validateSchema } from '../../src/core/api/validation.js';

describe('API validation and errors', () => {
  it('returns field validation errors from schemas', () => {
    const result = validateSchema(z.object({ volume: z.number().min(0).max(100) }), { volume: 200 }, 'body');

    expect(result.success).toBe(false);
    expect(result.errors?.[0]).toMatchObject({
      path: ['body', 'volume'],
      code: 'too_big',
    });
  });

  it('formats standardized API errors', () => {
    const error = apiError('FORBIDDEN', 'Nope', { reason: 'missing_permission' });
    const response = toAPIErrorResponse(error);

    expect(error).toBeInstanceOf(APIError);
    expect(response).toEqual({
      success: false,
      status: 403,
      error: {
        code: 'FORBIDDEN',
        message: 'Nope',
        details: { reason: 'missing_permission' },
      },
    });
  });

  it('provides response helpers', () => {
    expect(ok({ ready: true })).toEqual({ success: true, data: { ready: true }, status: 200 });
    expect(noContent()).toEqual({ success: true, data: null, status: 204 });
    expect(paginated([1], { page: 1, pageSize: 50, total: 1 })).toEqual({
      success: true,
      data: [1],
      meta: { page: 1, pageSize: 50, total: 1 },
      status: 200,
    });
    expect(fail('CONFLICT', 'Version conflict').status).toBe(409);
  });
});
