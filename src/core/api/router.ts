import { APIError, toAPIErrorResponse } from './errors.js';
import { validateRequest } from './validation.js';
import type { APIEndpoint, APIHttpMethod, APIMiddleware, APIRegisteredRoute, APIRequest, APIRequestContext, APIResponse } from './types.js';

interface RouteMatch {
  endpoint: APIEndpoint;
  params: Record<string, string>;
}

let requestCounter = 0;

export class APIRouter {
  private readonly routes: APIRegisteredRoute[] = [];
  private readonly middleware: APIMiddleware[] = [];

  constructor(readonly basePath = '/api/v1') {}

  use(middleware: APIMiddleware): void {
    this.middleware.push(middleware);
  }

  register(endpoint: APIEndpoint): void {
    const fullPath = this.toFullPath(endpoint.path);
    const duplicate = this.routes.some(
      (route) => route.endpoint.method === endpoint.method && route.fullPath === fullPath,
    );

    if (duplicate) {
      throw new Error(`Duplicate API route "${endpoint.method} ${fullPath}".`);
    }

    this.routes.push({ endpoint, fullPath });
  }

  getRoutes(): APIRegisteredRoute[] {
    return [...this.routes];
  }

  async handle(request: APIRequest): Promise<APIResponse> {
    try {
      const match = this.match(request.method, request.path);
      if (!match) {
        throw new APIError('NOT_FOUND', `Route not found: ${request.method} ${request.path}`);
      }

      const context: APIRequestContext = {
        requestId: this.nextRequestId(),
        startedAt: Date.now(),
        version: 'v1',
        params: match.params,
        endpoint: match.endpoint,
      };

      const requestWithParams = validateRequest(match.endpoint, { ...request, params: match.params });
      const pipeline = [...this.middleware, ...(match.endpoint.middleware ?? [])];
      let index = -1;

      const dispatch = async (): Promise<APIResponse> => {
        index += 1;
        const middleware = pipeline[index];
        if (middleware) {
          return middleware(requestWithParams, context, dispatch);
        }

        return match.endpoint.handler(requestWithParams, context);
      };

      return await dispatch();
    } catch (error) {
      return toAPIErrorResponse(error);
    }
  }

  private toFullPath(path: string): string {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${this.basePath}${normalizedPath}`.replace(/\/{2,}/g, '/');
  }

  private match(method: APIHttpMethod, requestPath: string): RouteMatch | undefined {
    for (const route of this.routes) {
      if (route.endpoint.method !== method) {
        continue;
      }

      const params = this.matchPath(route.fullPath, requestPath);
      if (params) {
        return { endpoint: route.endpoint, params };
      }
    }

    return undefined;
  }

  private matchPath(routePath: string, requestPath: string): Record<string, string> | undefined {
    const routeSegments = this.pathSegments(routePath);
    const requestSegments = this.pathSegments(requestPath);

    if (routeSegments.length !== requestSegments.length) {
      return undefined;
    }

    const params: Record<string, string> = {};

    for (let index = 0; index < routeSegments.length; index += 1) {
      const routeSegment = routeSegments[index];
      const requestSegment = requestSegments[index];

      if (!routeSegment || !requestSegment) {
        return undefined;
      }

      if (routeSegment.startsWith(':')) {
        params[routeSegment.slice(1)] = decodeURIComponent(requestSegment);
        continue;
      }

      if (routeSegment !== requestSegment) {
        return undefined;
      }
    }

    return params;
  }

  private pathSegments(path: string): string[] {
    return path.split('/').filter(Boolean);
  }

  private nextRequestId(): string {
    requestCounter += 1;
    return `api-${requestCounter}`;
  }
}
