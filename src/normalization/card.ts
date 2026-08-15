import { parseAttributes } from './attributes.js';
import { parsePosition } from './positions.js';
import { parsePrice, referencePrice } from './prices.js';
import {
  NormalizationError,
  type NormalizedCard,
  type RawCard,
} from './types.js';

/** `https://www.futbin.com/26/player/25561/nome` -> temporada 26. */
const SEASON_FROM_URL = /futbin\.com\/(\d{2})\/player\//i;

const GAME = 'FC';

/** Strings vazias da fonte viram ausência de dado, não string vazia. */
function orNull(value: string | undefined): string | null {
  const text = value?.trim() ?? '';
  return text === '' ? null : text;
}

function required(value: string | undefined, field: string): string {
  const text = orNull(value);
  if (text === null) {
    throw new NormalizationError(field, `Campo obrigatório ausente: ${field}`);
  }
  return text;
}

function parseRating(value: string | undefined): number {
  const text = required(value, 'rating');

  if (!/^\d+$/.test(text)) {
    throw new NormalizationError('rating', `Rating não numérico: "${value}"`);
  }

  const rating = Number(text);
  if (rating < 1 || rating > 99) {
    throw new NormalizationError('rating', `Rating fora da faixa: ${rating}`);
  }

  return rating;
}

/**
 * Temporada derivada da URL da fonte, nunca fixada em código —
 * é o que permite FC 26 e FC 27 coexistirem (ARCHITECTURE §26).
 */
export function parseSeason(url: string | undefined): number {
  const match = SEASON_FROM_URL.exec(url ?? '');

  if (!match?.[1]) {
    throw new NormalizationError(
      'url',
      `Não foi possível extrair a temporada de: "${url}"`,
    );
  }

  return Number(match[1]);
}

export interface NormalizeResult {
  card: NormalizedCard;
  /** Tokens de posição não reconhecidos, para o relatório de importação. */
  warnings: string[];
}

/**
 * Converte uma carta bruta na forma persistida (ARCHITECTURE §10).
 *
 * Lança `NormalizationError` em dado inválido. Quem chama decide se
 * aborta ou registra e segue — o script de ingestão registra e segue,
 * para que uma carta ruim não derrube a importação inteira.
 */
export function normalizeCard(raw: RawCard): NormalizeResult {
  const source_id = required(raw.id, 'id');
  const name = required(raw.name, 'name');
  const rating = parseRating(raw.rating);
  const season = parseSeason(raw.url);

  const position = parsePosition(raw.position);
  const attributes = parseAttributes(raw.stats);

  const price_ps = parsePrice(raw.price_ps, 'price_ps');
  const price_pc = parsePrice(raw.price_pc, 'price_pc');

  const player_image_url = orNull(raw.image_large);
  const card_image_url = orNull(raw.card_image_large_url);

  const has_player_image = player_image_url !== null;
  const has_price = price_ps !== null || price_pc !== null;

  const card: NormalizedCard = {
    source: 'futbin',
    source_id,
    game: GAME,
    season,

    name,
    rating,
    version: orNull(raw.version),
    club: orNull(raw.club),
    nation: orNull(raw.nation),
    league: orNull(raw.league),

    position: position.position,
    alt_positions: position.alt_positions,
    alt_positions_hidden: position.alt_positions_hidden,
    position_raw: (raw.position ?? '').trim(),
    is_goalkeeper: position.position === 'GK',

    ...attributes,

    player_image_url,
    player_image_small_url: orNull(raw.image),
    card_image_url,
    card_image_small_url: orNull(raw.card_image_url),

    price_ps,
    price_pc,
    price_ps_raw: orNull(raw.price_ps),
    price_pc_raw: orNull(raw.price_pc),
    reference_price: referencePrice(price_ps, price_pc),

    has_player_image,
    has_price,
    is_tradeable: has_price,
    is_complete: has_player_image && card_image_url !== null && has_price,

    source_url: orNull(raw.url),
  };

  const warnings = position.unknown.map(
    (token) => `posição desconhecida ignorada: "${token}"`,
  );

  return { card, warnings };
}
