import type { NormalizedCard, Position } from '../normalization/types.js';

/** Carta do catálogo: registro normalizado + identidade e índice de busca. */
export interface CatalogCard extends NormalizedCard {
  /** UUID determinístico derivado de source + source_id. */
  id: string;
  /** Nome, clube e versão sem acento e em minúsculas, para busca. */
  search_text: string;
  /**
   * Nome dobrado, usado só para ordenar.
   *
   * Precomputado porque `localeCompare` domina o custo de ordenar o
   * catálogo inteiro — comparar strings já normalizadas é ordens de
   * grandeza mais rápido e produz a mesma ordem, já que os acentos
   * foram removidos de ambos os lados.
   */
  sort_name: string;
}

export const SORT_FIELDS = [
  'rating',
  'name',
  'reference_price',
  'pace',
  'shooting',
  'passing',
  'dribbling',
  'defending',
  'physical',
] as const;

export type SortField = (typeof SORT_FIELDS)[number];
export type SortOrder = 'asc' | 'desc';

/** Filtros numéricos de atributo, aplicáveis a jogadores de linha. */
export interface AttributeFilters {
  min_pace?: number;
  min_shooting?: number;
  min_passing?: number;
  min_dribbling?: number;
  min_defending?: number;
  min_physical?: number;
}

/** Os mesmos seis slots, com o nome correto para goleiros. */
export interface GoalkeeperFilters {
  min_diving?: number;
  min_handling?: number;
  min_kicking?: number;
  min_reflexes?: number;
  min_speed?: number;
  min_positioning?: number;
}

export interface CardQuery extends AttributeFilters, GoalkeeperFilters {
  search?: string;
  ids?: string[];

  game?: string;
  season?: number;

  min_rating?: number;
  max_rating?: number;

  position?: Position[];
  plays_as?: Position[];
  include_goalkeepers?: boolean;

  version?: string[];
  club?: string[];
  nation?: string[];
  league?: string[];

  min_price?: number;
  max_price?: number;

  is_complete?: boolean;
  has_image?: boolean;
  is_tradeable?: boolean;

  sort?: SortField;
  order?: SortOrder;

  page?: number;
  limit?: number;
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface Paged<T> {
  data: T[];
  meta: PageMeta;
}

export interface Facet {
  value: string;
  count: number;
}

export interface CatalogStats {
  total: number;
  complete: number;
  tradeable: number;
  goalkeepers: number;
  rating: { min: number; max: number };
  reference_price: { min: number | null; max: number | null };
  seasons: number[];
  positions: Facet[];
}

/**
 * Contrato da camada de dados.
 *
 * Existe para que a implementação em memória possa ser trocada por uma
 * sobre banco sem tocar rotas, schemas ou apresentação (ARCHITECTURE §5).
 */
export interface CardRepository {
  list(query: CardQuery): Paged<CatalogCard>;
  findById(id: string): CatalogCard | null;
  findBySource(source: string, sourceId: string): CatalogCard | null;
  findManyByIds(ids: string[]): CatalogCard[];
  facets(field: 'league' | 'club' | 'version' | 'nation' | 'position'): Facet[];
  stats(): CatalogStats;
}
