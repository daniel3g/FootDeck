import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import { catalog } from '../../catalog/index.js';
import type { CardQuery } from '../../catalog/types.js';
import { env } from '../../config/env.js';
import { ApiError, notFound } from '../../errors.js';
import { cacheable } from '../../middleware/cache.js';
import { presentCard } from './cards.presenter.js';
import {
  CardListSchema,
  CardResponseSchema,
  ErrorSchema,
  cardIdParamSchema,
  listCardsQuerySchema,
  sourceParamSchema,
  type ListCardsQuery,
} from './cards.schemas.js';

const TAG = 'Cartas';

const jsonError = (description: string) => ({
  description,
  content: { 'application/json': { schema: ErrorSchema } },
});

const COPYABLE = [
  'search',
  'ids',
  'game',
  'season',
  'min_rating',
  'max_rating',
  'position',
  'plays_as',
  'include_goalkeepers',
  'version',
  'club',
  'nation',
  'league',
  'min_pace',
  'min_shooting',
  'min_passing',
  'min_dribbling',
  'min_defending',
  'min_physical',
  'min_diving',
  'min_handling',
  'min_kicking',
  'min_reflexes',
  'min_speed',
  'min_positioning',
  'min_price',
  'max_price',
  'is_complete',
  'has_image',
  'is_tradeable',
  'sort',
] as const;

/**
 * Traduz a query validada para o filtro do repositório.
 *
 * Campos ausentes são omitidos em vez de virarem `undefined` explícito —
 * `exactOptionalPropertyTypes` trata os dois casos como diferentes.
 */
function toCardQuery(query: ListCardsQuery): CardQuery {
  const result: CardQuery = { page: query.page, limit: query.limit };

  for (const key of COPYABLE) {
    const value = query[key];
    if (value !== undefined) {
      (result as Record<string, unknown>)[key] = value;
    }
  }

  if (query.sort) result.order = query.order;

  return result;
}

const listRoute = createRoute({
  method: 'get',
  path: '/cards',
  tags: [TAG],
  summary: 'Lista cartas com filtros, busca, ordenação e paginação',
  description: [
    'Filtros de atributo de linha (`min_pace`, `min_shooting`, …) **excluem goleiros**,',
    'porque comparar Diving com Pace não tem significado. Use `include_goalkeepers=true`',
    'para incluí-los, ou os filtros próprios de goleiro (`min_diving`, `min_reflexes`, …),',
    'que por sua vez retornam somente goleiros.',
    '',
    'Listas aceitam valores separados por vírgula: `?position=ST,CAM`.',
    '',
    'Ordenar por `reference_price` coloca as cartas sem preço sempre no fim.',
  ].join('\n'),
  request: { query: listCardsQuerySchema },
  responses: {
    200: {
      description: 'Coleção de cartas',
      content: { 'application/json': { schema: CardListSchema } },
    },
    400: jsonError('Parâmetros inválidos ou IDs demais'),
  },
});

const bySourceRoute = createRoute({
  method: 'get',
  path: '/cards/source/{source}/{sourceId}',
  tags: [TAG],
  summary: 'Busca uma carta pelo ID da fonte',
  description: 'Exemplo: `/cards/source/futbin/25561`.',
  request: { params: sourceParamSchema },
  responses: {
    200: {
      description: 'Carta encontrada',
      content: { 'application/json': { schema: CardResponseSchema } },
    },
    404: jsonError('Carta não encontrada'),
  },
});

const byIdRoute = createRoute({
  method: 'get',
  path: '/cards/{id}',
  tags: [TAG],
  summary: 'Busca uma carta pelo ID interno',
  request: { params: cardIdParamSchema },
  responses: {
    200: {
      description: 'Carta encontrada',
      content: { 'application/json': { schema: CardResponseSchema } },
    },
    404: jsonError('Carta não encontrada'),
  },
});

export const cardsRoutes = new OpenAPIHono();

cardsRoutes.use('/cards', cacheable);
cardsRoutes.use('/cards/*', cacheable);

cardsRoutes.openapi(listRoute, (c) => {
  const query = c.req.valid('query');

  if (query.ids && query.ids.length > env.MAX_IDS_PER_REQUEST) {
    throw new ApiError(
      'TOO_MANY_IDS',
      `Máximo de ${env.MAX_IDS_PER_REQUEST} IDs por requisição; recebidos ${query.ids.length}.`,
    );
  }

  const page = catalog.list(toCardQuery(query));

  return c.json({ data: page.data.map(presentCard), meta: page.meta }, 200);
});

// Registrada antes de /cards/{id}: na ordem inversa, "source" seria
// interpretado como um id e a rota nunca seria alcançada.
cardsRoutes.openapi(bySourceRoute, (c) => {
  const { source, sourceId } = c.req.valid('param');
  const card = catalog.findBySource(source, sourceId);

  if (!card) throw notFound(`Carta ${source}:${sourceId} não encontrada`);

  return c.json({ data: presentCard(card) }, 200);
});

cardsRoutes.openapi(byIdRoute, (c) => {
  const { id } = c.req.valid('param');
  const card = catalog.findById(id);

  if (!card) throw notFound(`Carta ${id} não encontrada`);

  return c.json({ data: presentCard(card) }, 200);
});
