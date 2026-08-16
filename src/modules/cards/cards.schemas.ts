import { z } from '@hono/zod-openapi';
import { env } from '../../config/env.js';
import { POSITIONS } from '../../normalization/types.js';
import { SORT_FIELDS } from '../../catalog/types.js';

/** `?position=ST,CAM` -> ['ST','CAM'] */
const csv = <T extends z.ZodTypeAny>(inner: T) =>
  z.preprocess(
    (value) =>
      typeof value === 'string'
        ? value
            .split(',')
            .map((part) => part.trim())
            .filter(Boolean)
        : value,
    z.array(inner),
  );

/** Query string não tem booleano; só as duas palavras são aceitas. */
const bool = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true')
  .openapi({ param: { schema: { type: 'boolean' } } });

const int = (min: number, max: number) =>
  z.coerce.number().int().min(min).max(max);

const rating = () => int(1, 99).optional();
const attribute = () => int(0, 99).optional();

const positionList = csv(z.enum(POSITIONS)).optional();
const stringList = csv(z.string().min(1)).optional();

export const listCardsQuerySchema = z.object({
  page: int(1, 100_000).default(1),
  limit: int(1, env.MAX_PAGE_SIZE).default(env.DEFAULT_PAGE_SIZE),

  search: z.string().min(1).optional().openapi({ example: 'ibrahimovic' }),
  ids: stringList,

  game: z.string().min(1).optional(),
  season: int(1, 99).optional().openapi({ example: 26 }),

  min_rating: rating(),
  max_rating: rating(),

  position: positionList.openapi({ example: ['ST'] }),
  plays_as: positionList,
  include_goalkeepers: bool.optional(),

  version: stringList,
  club: stringList,
  nation: stringList,
  league: stringList,

  min_pace: attribute(),
  min_shooting: attribute(),
  min_passing: attribute(),
  min_dribbling: attribute(),
  min_defending: attribute(),
  min_physical: attribute(),

  min_diving: attribute(),
  min_handling: attribute(),
  min_kicking: attribute(),
  min_reflexes: attribute(),
  min_speed: attribute(),
  min_positioning: attribute(),

  min_price: int(0, 1_000_000_000).optional(),
  max_price: int(0, 1_000_000_000).optional(),

  is_complete: bool.optional(),
  has_image: bool.optional(),
  is_tradeable: bool.optional(),

  sort: z.enum(SORT_FIELDS).optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export type ListCardsQuery = z.infer<typeof listCardsQuerySchema>;

export const cardIdParamSchema = z.object({
  id: z
    .string()
    .min(1)
    .openapi({ param: { name: 'id', in: 'path' } }),
});

export const sourceParamSchema = z.object({
  source: z
    .string()
    .min(1)
    .openapi({ param: { name: 'source', in: 'path' } }),
  sourceId: z
    .string()
    .min(1)
    .openapi({ param: { name: 'sourceId', in: 'path' } }),
});

// ─── Respostas ────────────────────────────────────────────────────────

const AttributesSchema = z
  .object({
    pace: z.number().nullable(),
    shooting: z.number().nullable(),
    passing: z.number().nullable(),
    dribbling: z.number().nullable(),
    defending: z.number().nullable(),
    physical: z.number().nullable(),
  })
  .openapi('Attributes');

const GoalkeeperSchema = z
  .object({
    diving: z.number().nullable(),
    handling: z.number().nullable(),
    kicking: z.number().nullable(),
    reflexes: z.number().nullable(),
    speed: z.number().nullable(),
    positioning: z.number().nullable(),
  })
  .openapi('GoalkeeperAttributes');

export const CardSchema = z
  .object({
    id: z.string(),
    source: z.string(),
    source_id: z.string(),
    game: z.string(),
    season: z.number(),

    name: z.string(),
    rating: z.number(),
    version: z.string().nullable(),
    club: z.string().nullable(),
    nation: z.string().nullable(),
    league: z.string().nullable(),

    position: z.enum(POSITIONS),
    alt_positions: z.array(z.enum(POSITIONS)),
    alt_positions_hidden: z.number().openapi({
      description:
        'Quantas posições alternativas a fonte omitiu. Maior que zero significa que alt_positions é uma lista parcial.',
    }),
    is_goalkeeper: z.boolean(),

    attributes: AttributesSchema.optional().openapi({
      description: 'Presente apenas quando is_goalkeeper = false.',
    }),
    goalkeeper: GoalkeeperSchema.optional().openapi({
      description: 'Presente apenas quando is_goalkeeper = true.',
    }),

    images: z.object({
      player: z.string().nullable(),
      player_small: z.string().nullable(),
      card: z.string().nullable(),
      card_small: z.string().nullable(),
    }),

    prices: z.object({
      playstation: z.number().nullable(),
      pc: z.number().nullable(),
      reference: z.number().nullable(),
      updated_at: z.string().openapi({
        description:
          'Quando os preços foram coletados da fonte. Não são atualizados em runtime — trate como instantâneo, não como cotação ao vivo.',
      }),
    }),

    flags: z.object({
      is_complete: z.boolean(),
      has_player_image: z.boolean(),
      is_tradeable: z.boolean(),
    }),

    source_url: z.string().nullable(),
  })
  .openapi('Card');

/**
 * O tipo da representação pública vem do próprio schema OpenAPI.
 *
 * Assim o presenter não pode divergir da documentação: se um campo mudar
 * aqui, o compilador aponta o presenter, e vice-versa.
 */
export type Card = z.infer<typeof CardSchema>;

export const MetaSchema = z
  .object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    total_pages: z.number(),
  })
  .openapi('PageMeta');

export const CardListSchema = z
  .object({ data: z.array(CardSchema), meta: MetaSchema })
  .openapi('CardList');

export const CardResponseSchema = z
  .object({ data: CardSchema })
  .openapi('CardResponse');

export const ErrorSchema = z
  .object({
    error: z.object({
      code: z.string(),
      message: z.string(),
      details: z.unknown().optional(),
    }),
  })
  .openapi('Error');

export const FacetListSchema = z
  .object({
    data: z.array(z.object({ value: z.string(), count: z.number() })),
  })
  .openapi('FacetList');

export const StatsSchema = z
  .object({
    data: z.object({
      total: z.number(),
      complete: z.number(),
      tradeable: z.number(),
      goalkeepers: z.number(),
      rating: z.object({ min: z.number(), max: z.number() }),
      reference_price: z.object({
        min: z.number().nullable(),
        max: z.number().nullable(),
      }),
      seasons: z.array(z.number()),
      positions: z.array(z.object({ value: z.string(), count: z.number() })),
      generated_at: z.string(),
      collected_at: z.string(),
    }),
  })
  .openapi('CatalogStats');
