/** As 12 posições primárias observadas no dataset (ARCHITECTURE §8). */
export const POSITIONS = [
  'GK',
  'CB',
  'LB',
  'RB',
  'CDM',
  'CM',
  'CAM',
  'LM',
  'RM',
  'LW',
  'RW',
  'ST',
] as const;

export type Position = (typeof POSITIONS)[number];

export function isPosition(value: string): value is Position {
  return (POSITIONS as readonly string[]).includes(value);
}

/** Carta como vem da fonte. Todo valor é string. */
export interface RawCard {
  id?: string;
  name?: string;
  url?: string;
  rating?: string;
  position?: string;
  version?: string;
  club?: string;
  nation?: string;
  league?: string;
  image?: string;
  card_image_url?: string;
  image_large?: string;
  card_image_large_url?: string;
  price_ps?: string;
  price_pc?: string;
  stats?: Record<string, string>;
}

export interface Attributes {
  pace: number | null;
  shooting: number | null;
  passing: number | null;
  dribbling: number | null;
  defending: number | null;
  physical: number | null;
}

/**
 * Os mesmos seis números, com o significado correto para goleiros.
 * A fonte entrega tudo sob os rótulos de jogador de linha (§9).
 */
export interface GoalkeeperAttributes {
  diving: number | null;
  handling: number | null;
  kicking: number | null;
  reflexes: number | null;
  speed: number | null;
  positioning: number | null;
}

export interface NormalizedCard {
  source: 'futbin';
  source_id: string;
  game: string;
  season: number;

  name: string;
  rating: number;
  version: string | null;
  club: string | null;
  nation: string | null;
  league: string | null;

  position: Position;
  alt_positions: Position[];
  alt_positions_hidden: number;
  position_raw: string;
  is_goalkeeper: boolean;

  pace: number | null;
  shooting: number | null;
  passing: number | null;
  dribbling: number | null;
  defending: number | null;
  physical: number | null;

  player_image_url: string | null;
  player_image_small_url: string | null;
  card_image_url: string | null;
  card_image_small_url: string | null;

  price_ps: number | null;
  price_pc: number | null;
  price_ps_raw: string | null;
  price_pc_raw: string | null;
  reference_price: number | null;

  has_player_image: boolean;
  has_price: boolean;
  is_complete: boolean;
  is_tradeable: boolean;

  source_url: string | null;
}

/** Erro de normalização com o identificador da carta, para o relatório. */
export class NormalizationError extends Error {
  readonly field: string;

  constructor(field: string, message: string) {
    super(message);
    this.name = 'NormalizationError';
    this.field = field;
  }
}
