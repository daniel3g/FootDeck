import { OpenAPIHono } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { corsOrigin, env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { validationError } from './errors.js';
import { healthRoutes } from './modules/health/health.routes.js';
import { cardsRoutes } from './modules/cards/cards.routes.js';
import { metadataRoutes } from './modules/metadata/metadata.routes.js';
import { manualRoutes } from './modules/manual/manual.routes.js';

/**
 * Monta a aplicação. Não escuta porta — quem escuta é `src/server.ts`
 * (local) ou `api/index.ts` (Vercel). Isso mantém os testes sem rede:
 * o Vitest importa `app` e chama `app.request(...)` direto.
 */
export function createApp(): OpenAPIHono {
  const app = new OpenAPIHono({
    // Erros de validação entram no mesmo formato das demais falhas (§15).
    defaultHook: (result, _c) => {
      if (!result.success) {
        throw validationError(
          'Parâmetros inválidos',
          result.error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        );
      }
    },
  });

  app.onError(errorHandler);
  app.notFound(notFoundHandler);

  if (env.NODE_ENV !== 'test') app.use('*', logger());

  app.use(
    '*',
    cors({
      origin: corsOrigin === '*' ? '*' : corsOrigin.split(','),
      allowMethods: ['GET', 'OPTIONS'],
      maxAge: 86_400,
    }),
  );

  const base = `/api/${env.API_VERSION}`;

  app.route(base, healthRoutes);
  app.route(base, cardsRoutes);
  app.route(base, metadataRoutes);

  app.doc(`${base}/openapi.json`, {
    openapi: '3.0.0',
    info: {
      title: 'Football Cards API',
      version: '0.1.0',
      description: [
        'Catálogo de cartas de futebol. Serviço genérico de consulta, independente das regras de qualquer jogo.',
        '',
        'Esta página lista o contrato campo por campo. Para o passo a passo de uso — convenções,',
        'a regra dos goleiros, receitas de consulta e as armadilhas — veja o [manual](/manual).',
      ].join('\n'),
    },
    servers: [{ url: '/', description: 'Servidor atual' }],
  });

  app.get('/docs', swaggerUI({ url: `${base}/openapi.json` }));

  // Documentação em HTML, fora do prefixo de versão (ver manual.routes.ts).
  app.route('/', manualRoutes);

  app.get('/', (c) => c.redirect('/docs'));

  return app;
}

export const app = createApp();
