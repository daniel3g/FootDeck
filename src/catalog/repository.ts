import type { NormalizedCard } from '../normalization/types.js';
import { cardId } from './identity.js';
import { buildSearchText, foldText } from './text.js';
import type {
  CardQuery,
  CardRepository,
  CatalogCard,
  CatalogStats,
  Facet,
  Paged,
  SortField,
} from './types.js';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

/** Filtros de atributo de jogador de linha e o campo que cada um lê. */
const LINE_FILTERS = [
  ['min_pace', 'pace'],
  ['min_shooting', 'shooting'],
  ['min_passing', 'passing'],
  ['min_dribbling', 'dribbling'],
  ['min_defending', 'defending'],
  ['min_physical', 'physical'],
] as const;

/**
 * Filtros de goleiro. Leem os mesmos seis campos físicos, porque é ali
 * que a fonte guarda os atributos de GK sob rótulos errados (§9).
 */
const GK_FILTERS = [
  ['min_diving', 'pace'],
  ['min_handling', 'shooting'],
  ['min_kicking', 'passing'],
  ['min_reflexes', 'dribbling'],
  ['min_speed', 'defending'],
  ['min_positioning', 'physical'],
] as const;

export function toCatalogCard(card: NormalizedCard): CatalogCard {
  return {
    ...card,
    id: cardId(card.source, card.source_id),
    search_text: buildSearchText([card.name, card.club, card.version]),
    sort_name: foldText(card.name),
  };
}

/** Ordenação: nulos sempre por último, em qualquer direção. */
function compareNullable(
  a: number | null,
  b: number | null,
  order: 'asc' | 'desc',
): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return order === 'asc' ? a - b : b - a;
}

function compareBy(
  a: CatalogCard,
  b: CatalogCard,
  field: SortField,
  order: 'asc' | 'desc',
): number {
  if (field === 'name') {
    const result =
      a.sort_name < b.sort_name ? -1 : a.sort_name > b.sort_name ? 1 : 0;
    return order === 'asc' ? result : -result;
  }
  return compareNullable(a[field], b[field], order);
}

export class InMemoryCardRepository implements CardRepository {
  private readonly cards: CatalogCard[];
  private readonly byId: Map<string, CatalogCard>;
  private readonly bySource: Map<string, CatalogCard>;

  constructor(source: NormalizedCard[]) {
    this.cards = source.map(toCatalogCard);
    this.byId = new Map(this.cards.map((c) => [c.id, c]));
    this.bySource = new Map(
      this.cards.map((c) => [`${c.source}:${c.source_id}`, c]),
    );
  }

  get size(): number {
    return this.cards.length;
  }

  list(query: CardQuery): Paged<CatalogCard> {
    const filtered = this.cards.filter((card) => this.matches(card, query));

    const sort = query.sort;
    if (sort) {
      const order = query.order ?? 'asc';
      // Desempate por id mantém a paginação estável: sem ele, cartas de
      // mesmo rating podem trocar de página entre requisições.
      filtered.sort(
        (a, b) => compareBy(a, b, sort, order) || a.id.localeCompare(b.id),
      );
    }

    const limit = Math.max(1, query.limit ?? DEFAULT_LIMIT);
    const total = filtered.length;
    const total_pages = Math.max(1, Math.ceil(total / limit));
    const page = Math.max(DEFAULT_PAGE, query.page ?? DEFAULT_PAGE);
    const start = (page - 1) * limit;

    return {
      data: filtered.slice(start, start + limit),
      meta: { page, limit, total, total_pages },
    };
  }

  findById(id: string): CatalogCard | null {
    return this.byId.get(id) ?? null;
  }

  findBySource(source: string, sourceId: string): CatalogCard | null {
    return this.bySource.get(`${source}:${sourceId}`) ?? null;
  }

  /** IDs inexistentes são omitidos, não geram erro (ARCHITECTURE §14). */
  findManyByIds(ids: string[]): CatalogCard[] {
    const found: CatalogCard[] = [];
    for (const id of ids) {
      const card = this.byId.get(id);
      if (card) found.push(card);
    }
    return found;
  }

  facets(
    field: 'league' | 'club' | 'version' | 'nation' | 'position',
  ): Facet[] {
    const tally = new Map<string, number>();

    for (const card of this.cards) {
      const value = card[field];
      if (value === null) continue;
      tally.set(value, (tally.get(value) ?? 0) + 1);
    }

    return [...tally.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
  }

  stats(): CatalogStats {
    const ratings = this.cards.map((c) => c.rating);
    const prices = this.cards
      .map((c) => c.reference_price)
      .filter((p): p is number => p !== null);

    return {
      total: this.cards.length,
      complete: this.cards.filter((c) => c.is_complete).length,
      tradeable: this.cards.filter((c) => c.is_tradeable).length,
      goalkeepers: this.cards.filter((c) => c.is_goalkeeper).length,
      rating: { min: Math.min(...ratings), max: Math.max(...ratings) },
      reference_price: {
        min: prices.length ? Math.min(...prices) : null,
        max: prices.length ? Math.max(...prices) : null,
      },
      seasons: [...new Set(this.cards.map((c) => c.season))].sort(
        (a, b) => a - b,
      ),
      positions: this.facets('position'),
    };
  }

  private matches(card: CatalogCard, q: CardQuery): boolean {
    if (q.ids && !q.ids.includes(card.id)) return false;

    if (q.search) {
      const term = foldText(q.search);
      if (term && !card.search_text.includes(term)) return false;
    }

    if (q.game !== undefined && card.game !== q.game) return false;
    if (q.season !== undefined && card.season !== q.season) return false;

    if (q.min_rating !== undefined && card.rating < q.min_rating) return false;
    if (q.max_rating !== undefined && card.rating > q.max_rating) return false;

    if (q.position && !q.position.includes(card.position)) return false;

    if (
      q.plays_as &&
      !q.plays_as.some(
        (p) => card.position === p || card.alt_positions.includes(p),
      )
    ) {
      return false;
    }

    if (q.version && !this.inList(card.version, q.version)) return false;
    if (q.club && !this.inList(card.club, q.club)) return false;
    if (q.nation && !this.inList(card.nation, q.nation)) return false;
    if (q.league && !this.inList(card.league, q.league)) return false;

    const price = card.reference_price;
    if (q.min_price !== undefined && (price === null || price < q.min_price)) {
      return false;
    }
    if (q.max_price !== undefined && (price === null || price > q.max_price)) {
      return false;
    }

    if (q.is_complete !== undefined && card.is_complete !== q.is_complete) {
      return false;
    }
    if (q.has_image !== undefined && card.has_player_image !== q.has_image) {
      return false;
    }
    if (q.is_tradeable !== undefined && card.is_tradeable !== q.is_tradeable) {
      return false;
    }

    return this.matchesAttributes(card, q);
  }

  /**
   * Regra dos goleiros (ARCHITECTURE §9): comparar Diving com Pace não tem
   * significado, então filtros de linha excluem GKs por padrão e filtros de
   * goleiro excluem quem não é GK.
   */
  private matchesAttributes(card: CatalogCard, q: CardQuery): boolean {
    const lineFilters = LINE_FILTERS.filter((f) => q[f[0]] !== undefined);
    const gkFilters = GK_FILTERS.filter((f) => q[f[0]] !== undefined);

    if (q.include_goalkeepers === false && card.is_goalkeeper) return false;

    if (gkFilters.length > 0) {
      if (!card.is_goalkeeper) return false;
      for (const [param, field] of gkFilters) {
        const value = card[field];
        if (value === null || value < (q[param] as number)) return false;
      }
    }

    if (lineFilters.length > 0) {
      if (card.is_goalkeeper && q.include_goalkeepers !== true) return false;
      for (const [param, field] of lineFilters) {
        const value = card[field];
        if (value === null || value < (q[param] as number)) return false;
      }
    }

    return true;
  }

  private inList(value: string | null, allowed: string[]): boolean {
    if (value === null) return false;
    const folded = allowed.map(foldText);
    return folded.includes(foldText(value));
  }
}
