import { z } from 'zod';

import type { LogsService, DashboardLogLevel } from '../logs/logs.service.js';
import { ok } from './responses.js';
import type { APIEndpoint } from './types.js';

export interface LogsEndpointDependencies {
  readonly logs: LogsService;
}

const logsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(1000).optional(),
  cursor: z.string().min(1).optional(),
  search: z.string().optional(),
  level: z.union([z.string(), z.array(z.string())]).optional(),
  module: z.union([z.string(), z.array(z.string())]).optional(),
  since: z.coerce.number().int().min(0).optional(),
});

export function createLogsEndpoints({ logs }: LogsEndpointDependencies): APIEndpoint[] {
  return [
    {
      module: 'platform',
      method: 'GET',
      path: '/guilds/:guildId/logs',
      auth: 'guild_admin',
      query: logsQuerySchema,
      metadata: { operationId: 'getLogs', tags: ['logs'] },
      handler: async (request) => {
        const query = request.query as z.infer<typeof logsQuerySchema> | undefined;
        return ok(logs.queryGuild(request.params?.['guildId'] ?? '', {
          limit: query?.limit,
          cursor: query?.cursor,
          search: query?.search,
          since: query?.since,
          levels: toArray(query?.level).map((level) => level.toUpperCase() as DashboardLogLevel),
          modules: toArray(query?.module),
        }));
      },
    },
  ];
}

function toArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : value.split(',').map((entry) => entry.trim()).filter(Boolean);
}
