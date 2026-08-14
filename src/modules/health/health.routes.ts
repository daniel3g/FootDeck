import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { noStore } from '../../middleware/cache.js';
import { env } from '../../config/env.js';

const HealthSchema = z
  .object({
    status: z.literal('ok'),
    version: z.string(),
    environment: z.string(),
    uptime_seconds: z.number(),
    timestamp: z.string(),
  })
  .openapi('Health');

const healthRoute = createRoute({
  method: 'get',
  path: '/health',
  tags: ['Sistema'],
  summary: 'Verifica se a API está no ar',
  description:
    'Não é cacheável. Também serve como alvo do cron que impede o projeto Supabase de pausar por inatividade.',
  responses: {
    200: {
      description: 'API operacional',
      content: { 'application/json': { schema: HealthSchema } },
    },
  },
});

export const healthRoutes = new OpenAPIHono();

healthRoutes.use('/health', noStore);

healthRoutes.openapi(healthRoute, (c) =>
  c.json({
    status: 'ok' as const,
    version: env.API_VERSION,
    environment: env.NODE_ENV,
    uptime_seconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  }),
);
