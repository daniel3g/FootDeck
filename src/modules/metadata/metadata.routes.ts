import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import {
  catalog,
  catalogCollectedAt,
  catalogGeneratedAt,
} from '../../catalog/index.js';
import { cacheable } from '../../middleware/cache.js';
import { FacetListSchema, StatsSchema } from '../cards/cards.schemas.js';

const TAG = 'Metadados';

/**
 * Valores distintos com contagem, para montar filtros na interface sem
 * hardcode (ARCHITECTURE §14). Cada endpoint é uma faceta do catálogo.
 */
const FACETS = [
  ['leagues', 'league', 'Lista as ligas com a contagem de cartas'],
  ['clubs', 'club', 'Lista os clubes com a contagem de cartas'],
  ['versions', 'version', 'Lista as versões de carta com a contagem'],
  ['nations', 'nation', 'Lista as nacionalidades com a contagem'],
  ['positions', 'position', 'Lista as posições primárias com a contagem'],
] as const;

export const metadataRoutes = new OpenAPIHono();

metadataRoutes.use('/*', cacheable);

for (const [path, field, summary] of FACETS) {
  metadataRoutes.openapi(
    createRoute({
      method: 'get',
      path: `/${path}`,
      tags: [TAG],
      summary,
      responses: {
        200: {
          description: 'Valores ordenados por contagem decrescente',
          content: { 'application/json': { schema: FacetListSchema } },
        },
      },
    }),
    (c) => c.json({ data: catalog.facets(field) }),
  );
}

metadataRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/stats',
    tags: [TAG],
    summary: 'Resumo do catálogo',
    description:
      'Totais, faixa de ratings e distribuição por posição. `generated_at` indica quando o catálogo foi normalizado.',
    responses: {
      200: {
        description: 'Estatísticas do catálogo',
        content: { 'application/json': { schema: StatsSchema } },
      },
    },
  }),
  (c) =>
    c.json({
      data: {
        ...catalog.stats(),
        generated_at: catalogGeneratedAt,
        collected_at: catalogCollectedAt,
      },
    }),
);
