import { serve } from '@hono/node-server';
import { app } from './app.js';
import { env, isProduction } from './config/env.js';

/**
 * Entrypoint único: `package.json` → "main".
 *
 * Local, roda via tsx. Na Vercel, é este arquivo que a plataforma executa
 * (modo servidor), injetando PORT. Não há um segundo entrypoint para a
 * nuvem — o mesmo processo atende todas as rotas nos dois ambientes, o que
 * também permite reaproveitar conexões de banco entre requisições.
 */
serve({ fetch: app.fetch, port: env.PORT, hostname: '0.0.0.0' }, (info) => {
  if (isProduction) {
    console.log(`Football Cards API ouvindo na porta ${info.port}`);
    return;
  }

  console.log('');
  console.log('  Football Cards API');
  console.log(`  http://localhost:${info.port}/docs`);
  console.log(`  http://localhost:${info.port}/api/${env.API_VERSION}/health`);
  console.log('');
});
