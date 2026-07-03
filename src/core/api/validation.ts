import type { ZodError, ZodTypeAny } from 'zod';
import { APIError } from './errors.js';
import type { APIEndpoint, APIMiddleware, APIRequest } from './types.js';

export interface APIFieldValidationError {
  path: string[];
  message: string;
  code: string;
}

export interface APIValidationResult<T = unknown> {
  success: boolean;
  data?: T;
  errors?: APIFieldValidationError[];
}

export function validateSchema<T = unknown>(schema: ZodTypeAny, value: unknown, rootPath: string): APIValidationResult<T> {
  const result = schema.safeParse(value);

  if (result.success) {
    return { success: true, data: result.data as T };
  }

  return {
    success: false,
    errors: formatZodError(result.error, rootPath),
  };
}

export function validateRequest(endpoint: APIEndpoint, request: APIRequest): APIRequest {
  const fields: Array<['params' | 'query' | 'body', ZodTypeAny | undefined, unknown]> = [
    ['params', endpoint.params, request.params ?? {}],
    ['query', endpoint.query, request.query ?? {}],
    ['body', endpoint.body, request.body],
  ];
  const errors: APIFieldValidationError[] = [];
  const validated: APIRequest = { ...request };

  for (const [field, schema, value] of fields) {
    if (!schema) {
      continue;
    }

    const result = validateSchema(schema, value, field);
    if (result.success) {
      validated[field] = result.data as never;
    } else {
      errors.push(...(result.errors ?? []));
    }
  }

  if (errors.length > 0) {
    throw new APIError('VALIDATION_ERROR', 'Request validation failed', { fields: errors });
  }

  return validated;
}

export function validationMiddleware(endpoint: APIEndpoint): APIMiddleware {
  return async (request, context, next) => {
    validateRequest(endpoint, request);
    return next();
  };
}

function formatZodError(error: ZodError, rootPath: string): APIFieldValidationError[] {
  return error.issues.map((issue) => ({
    path: [rootPath, ...issue.path.map(String)],
    message: issue.message,
    code: issue.code,
  }));
}
