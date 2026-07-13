import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { Buffer } from 'node:buffer';
import { URL } from 'node:url';

import type { ILogger } from '../logger/logger.service.js';
import type { IAuthorizationProvider, ISessionProvider, SessionConfig, SessionRecord } from '../auth/index.js';
import type { DashboardLogEntry, LogsService } from '../logs/logs.service.js';
import type { APIRouter } from './router.js';
import type { DashboardStateEvents } from './dashboard-state.events.js';
import { authorizeGuildRequest } from './authorization.middleware.js';
import { applySecurityHeaders } from './security-headers.middleware.js';
import { readCookie } from './session-auth.middleware.js';
import type { APIHttpMethod, APIRequest, APIResponse } from './types.js';

const SUPPORTED_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
const MAX_BODY_BYTES = 1_048_576; // 1 MB

export interface APIHttpServerOptions {
  port: number;
  router: APIRouter;
  logger: ILogger;
  cors?: APICorsOptions;
  logsStream?: APILogsStreamOptions;
  dashboardStateStream?: APIDashboardStateStreamOptions;
  trustProxy?: boolean;
}

export interface APIDashboardStateStreamOptions {
  readonly path: string;
  readonly events: DashboardStateEvents;
  readonly sessionProvider: ISessionProvider;
  readonly sessionConfig: SessionConfig;
}

export interface APILogsStreamOptions {
  readonly path: string;
  readonly logs: LogsService;
  readonly sessionProvider: ISessionProvider;
  readonly sessionConfig: SessionConfig;
  readonly authorizationProvider: IAuthorizationProvider;
}

export interface APICorsOptions {
  readonly nodeEnv: string;
  readonly allowedOrigin: string;
}

export interface APIHttpServer {
  port: number;
  start(): Promise<void>;
  stop(): Promise<void>;
}

export function createAPIHttpServer({ port, router, logger, cors, logsStream, dashboardStateStream, trustProxy = false }: APIHttpServerOptions): APIHttpServer {
  const server = createServer(async (request, response) => {
    setCorsHeaders(request, response, cors);
    applySecurityHeaders(response);

    if (request.method === 'OPTIONS') {
      response.writeHead(204);
      response.end();
      return;
    }

    try {
      if (await handleLogsStream(request, response, logsStream) || await handleDashboardStateStream(request, response, dashboardStateStream)) {
        return;
      }

      const apiRequest = await toAPIRequest(request, trustProxy);
      const apiResponse = await router.handle(apiRequest);
      sendJSON(response, apiResponse);
    } catch (error) {
      logger.error({ error }, 'Unhandled API server error');
      sendJSON(response, {
        success: false,
        status: 500,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      });
    }
  });

  return {
    port,
    start: () => listen(server, port, logger),
    stop: () => close(server, logger),
  };
}

export async function handleLogsStream(
  request: IncomingMessage,
  response: ServerResponse,
  stream: APILogsStreamOptions | undefined,
): Promise<boolean> {
  if (!stream || request.method !== 'GET') {
    return false;
  }

  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
  const escapedPath = stream.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`^${escapedPath.replace(':guildId', '([^/]+)')}$`).exec(url.pathname);
  if (!match) return false;
  const guildId = decodeURIComponent(match[1] ?? '');

  const sessionId = readCookie(toHeaders(request)['cookie'], stream.sessionConfig.cookieName);
  const provider = stream.sessionProvider as ISessionProvider & { getSessionRecord?(id: string): Promise<SessionRecord | undefined> };
  const session = sessionId ? await provider.getSessionRecord?.(sessionId) : undefined;
  if (!session) {
    sendJSON(response, {
      success: false,
      status: 401,
      error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
    });
    return true;
  }
  const denied = await authorizeGuildRequest(stream.authorizationProvider, session, guildId);
  if (denied) {
    sendJSON(response, denied);
    return true;
  }

  response.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  response.write(': connected\n\n');

  const heartbeat = setInterval(() => response.write(': heartbeat\n\n'), 25_000);
  const unsubscribe = stream.logs.subscribeGuild(guildId, (entry) => writeSSE(response, entry));
  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    clearInterval(heartbeat);
    unsubscribe();
    request.off('close', cleanup);
    request.off('error', cleanup);
    response.off('close', cleanup);
    response.off('error', cleanup);
    response.off('finish', cleanup);
  };
  request.once('close', cleanup);
  request.once('error', cleanup);
  response.once('close', cleanup);
  response.once('error', cleanup);
  response.once('finish', cleanup);

  return true;
}

async function handleDashboardStateStream(
  request: IncomingMessage,
  response: ServerResponse,
  stream: APIDashboardStateStreamOptions | undefined,
): Promise<boolean> {
  if (!stream || request.method !== 'GET') return false;
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
  if (url.pathname !== stream.path) return false;
  const sessionId = readCookie(toHeaders(request)['cookie'], stream.sessionConfig.cookieName);
  const provider = stream.sessionProvider as ISessionProvider & { getSessionRecord?(id: string): Promise<SessionRecord | undefined> };
  const session = sessionId ? await provider.getSessionRecord?.(sessionId) : undefined;
  if (!session) {
    sendJSON(response, { success: false, status: 401, error: { code: 'AUTH_REQUIRED', message: 'Authentication required' } });
    return true;
  }
  const guildId = url.searchParams.get('guildId');
  const guilds = Array.isArray(session.metadata?.['guilds']) ? session.metadata['guilds'] : [];
  if (!guildId || !guilds.some((guild) => typeof guild === 'object' && guild !== null && (guild as { id?: string }).id === guildId)) {
    sendJSON(response, { success: false, status: 403, error: { code: 'FORBIDDEN', message: 'Guild access denied' } });
    return true;
  }
  response.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  response.write(': connected\n\n');
  const heartbeat = setInterval(() => response.write(': heartbeat\n\n'), 25_000);
  const unsubscribe = stream.events.subscribe((event) => {
    if (event.guildId === guildId) response.write(`event: module-state\ndata: ${JSON.stringify(event)}\n\n`);
  });
  request.on('close', () => { clearInterval(heartbeat); unsubscribe(); });
  return true;
}

function writeSSE(response: ServerResponse, entry: DashboardLogEntry): void {
  response.write(`id: ${entry.id}\n`);
  response.write('event: log\n');
  response.write(`data: ${JSON.stringify(entry)}\n\n`);
}

async function toAPIRequest(request: IncomingMessage, trustProxy: boolean): Promise<APIRequest> {
  const method = request.method ?? 'GET';
  if (!SUPPORTED_METHODS.has(method)) {
    return {
      method: 'GET',
      path: '__unsupported_method__',
    };
  }

  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
  const body = await readBody(request);

  return {
    method: method as APIHttpMethod,
    path: url.pathname,
    headers: toHeaders(request),
    ip: clientIp(request, trustProxy),
    query: Object.fromEntries(url.searchParams.entries()),
    body,
  };
}

export function clientIp(request: IncomingMessage, trustProxy: boolean): string {
  const forwardedFor = request.headers['x-forwarded-for'];
  const forwarded = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
  const firstForwarded = forwarded?.split(',')[0]?.trim();
  return trustProxy ? firstForwarded || request.socket.remoteAddress || 'unknown' : request.socket.remoteAddress || 'unknown';
}

function toHeaders(request: IncomingMessage): Record<string, string | undefined> {
  return Object.fromEntries(
    Object.entries(request.headers).map(([key, value]) => [key, Array.isArray(value) ? value.join(',') : value]),
  );
}

async function readBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  for await (const chunk of request) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buf.length;
    if (totalBytes > MAX_BODY_BYTES) {
      throw new Error('Request body exceeds maximum allowed size');
    }
    chunks.push(buf);
  }

  if (chunks.length === 0) {
    return undefined;
  }

  const raw = Buffer.concat(chunks).toString('utf-8');
  if (!raw) {
    return undefined;
  }

  const contentType = request.headers['content-type'] ?? '';
  if (contentType.includes('application/json')) {
    return JSON.parse(raw);
  }

  return raw;
}

function sendJSON(response: ServerResponse, apiResponse: APIResponse): void {
  const status = apiResponse.status ?? 200;
  if (status >= 300 && status < 400 && apiResponse.headers?.['Location']) {
    response.writeHead(status, apiResponse.headers);
    response.end();
    return;
  }

  response.writeHead(status, { 'Content-Type': 'application/json', ...apiResponse.headers });
  response.end(JSON.stringify(apiResponse));
}

export function resolveAllowedOrigin(requestOrigin: string | undefined, options: APICorsOptions | undefined): string | undefined {
  if (!options) {
    return requestOrigin ?? '*';
  }

  if (options.nodeEnv !== 'production') {
    if (!requestOrigin) {
      return options.allowedOrigin;
    }

    return isLocalhostOrigin(requestOrigin) ? requestOrigin : undefined;
  }

  return requestOrigin === options.allowedOrigin ? options.allowedOrigin : undefined;
}

function setCorsHeaders(request: IncomingMessage, response: ServerResponse, options: APICorsOptions | undefined): void {
  const origin = Array.isArray(request.headers.origin) ? request.headers.origin[0] : request.headers.origin;
  const allowedOrigin = resolveAllowedOrigin(origin, options);
  if (allowedOrigin) {
    response.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    response.setHeader('Vary', 'Origin');
  }

  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-CSRF-Token');
  response.setHeader('Access-Control-Allow-Credentials', 'true');
}

function isLocalhostOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '[::1]';
  } catch {
    return false;
  }
}

function listen(server: Server, port: number, logger: ILogger): Promise<void> {
  return new Promise((resolve, reject) => {
    const onError = (error: Error) => {
      server.off('listening', onListening);
      reject(error);
    };
    const onListening = () => {
      server.off('error', onError);
      logger.info({ port }, 'API server listening');
      resolve();
    };

    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(port, '127.0.0.1');
  });
}

function close(server: Server, logger: ILogger): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!server.listening) {
      resolve();
      return;
    }

    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      logger.info('API server stopped');
      resolve();
    });
  });
}
