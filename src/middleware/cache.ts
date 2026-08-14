import { createMiddleware } from 'hono/factory';
import { env } from '../config/env.js';

/**
 * Cache de borda (ARCHITECTURE §5).
 *
 * O catálogo é somente leitura, então a CDN — não a função — deve responder
 * à maioria das requisições. É isso que torna o limite do plano gratuito
 * irrelevante na prática.
 *
 * `s-maxage` fala com a CDN; `max-age=0` impede que o navegador guarde uma
 * cópia própria que ignoraria uma invalidação.
 */
export const cacheable = createMiddleware(async (c, next) => {
  await next();

  if (c.req.method !== 'GET' || c.res.status !== 200) return;

  c.res.headers.set(
    'Cache-Control',
    `public, max-age=0, s-maxage=${env.CACHE_MAX_AGE}, stale-while-revalidate=604800`,
  );
});

/**
 * O oposto: /health precisa medir o estado atual. Se for cacheado,
 * deixa de medir o que se propõe a medir.
 */
export const noStore = createMiddleware(async (c, next) => {
  await next();
  c.res.headers.set('Cache-Control', 'no-store');
});
