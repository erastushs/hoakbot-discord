import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { Buffer } from 'node:buffer';
import { URL } from 'node:url';

import type { ILogger } from '../logger/logger.service.js';
import type { APIRouter } from './router.js';
import type { APIHttpMethod, APIRequest, APIResponse } from './types.js';

const SUPPORTED_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
const MAX_BODY_BYTES = 1_048_576; // 1 MB

export interface APIHttpServerOptions {
  port: number;
  router: APIRouter;
  logger: ILogger;
}

export interface APIHttpServer {
  port: number;
  start(): Promise<void>;
  stop(): Promise<void>;
}

export function createAPIHttpServer({ port, router, logger }: APIHttpServerOptions): APIHttpServer {
  const server = createServer(async (request, response) => {
    setCorsHeaders(response);

    if (request.method === 'OPTIONS') {
      response.writeHead(204);
      response.end();
      return;
    }

    try {
      const apiRequest = await toAPIRequest(request);
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

async function toAPIRequest(request: IncomingMessage): Promise<APIRequest> {
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
    query: Object.fromEntries(url.searchParams.entries()),
    body,
  };
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

function setCorsHeaders(response: ServerResponse): void {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
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
