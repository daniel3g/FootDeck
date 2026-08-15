import { isPosition, NormalizationError, type Position } from './types.js';

export interface ParsedPosition {
  /** Posição principal. */
  position: Position;
  /** Alternativas listadas pela fonte — lista PARCIAL quando `hidden > 0`. */
  alt_positions: Position[];
  /** Quantas alternativas a fonte omitiu. Vem do token "+N". */
  alt_positions_hidden: number;
  /** Tokens que não são posições conhecidas. Viram aviso, não silêncio. */
  unknown: string[];
}

const HIDDEN_TOKEN = /^\+(\d+)$/;

/**
 * Interpreta o campo de posição da fonte (ARCHITECTURE §8).
 *
 *   "ST++LM, LW"           -> ST, alternativas [LM, LW]
 *   "GK++"                 -> GK, sem alternativas
 *   "GK"                   -> GK, sem o separador (1 ocorrência no dataset)
 *   "CAM++RM, CM, LM, +3"  -> CAM, 3 alternativas listadas, 3 omitidas
 *
 * A fonte trunca a lista em 3 alternativas. Em 238 das 1200 cartas
 * `alt_positions` é portanto uma lista parcial, e é por isso que
 * `alt_positions_hidden` existe em vez de fingirmos completude.
 */
export function parsePosition(raw: string | undefined): ParsedPosition {
  const input = (raw ?? '').trim();

  if (input === '') {
    throw new NormalizationError('position', 'Posição vazia');
  }

  const separator = input.indexOf('++');
  const head = (separator === -1 ? input : input.slice(0, separator)).trim();
  const tail = separator === -1 ? '' : input.slice(separator + 2);

  if (!isPosition(head)) {
    throw new NormalizationError(
      'position',
      `Posição principal desconhecida: "${head}" (de "${input}")`,
    );
  }

  const alt_positions: Position[] = [];
  const unknown: string[] = [];
  let alt_positions_hidden = 0;

  for (const token of tail.split(',')) {
    const value = token.trim();
    if (value === '') continue;

    const hidden = HIDDEN_TOKEN.exec(value);
    if (hidden?.[1] !== undefined) {
      alt_positions_hidden += Number(hidden[1]);
      continue;
    }

    if (!isPosition(value)) {
      unknown.push(value);
      continue;
    }

    // A fonte repete a principal em algumas cartas; não duplicamos.
    if (value !== head && !alt_positions.includes(value)) {
      alt_positions.push(value);
    }
  }

  return { position: head, alt_positions, alt_positions_hidden, unknown };
}
