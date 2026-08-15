import {
  NormalizationError,
  type Attributes,
  type GoalkeeperAttributes,
} from './types.js';

/** Ordem dos seis slots como a fonte os entrega. */
const SLOTS = ['PAC', 'SHO', 'PAS', 'DRI', 'DEF', 'PHY'] as const;

const FIELDS = [
  'pace',
  'shooting',
  'passing',
  'dribbling',
  'defending',
  'physical',
] as const satisfies readonly (keyof Attributes)[];

function toNumber(value: string | undefined, field: string): number | null {
  if (value === undefined) return null;

  const text = value.trim();
  if (text === '') return null;

  if (!/^\d+$/.test(text)) {
    throw new NormalizationError(field, `Atributo não numérico: "${value}"`);
  }

  return Number(text);
}

export function parseAttributes(
  stats: Record<string, string> | undefined,
): Attributes {
  const source = stats ?? {};

  return FIELDS.reduce((acc, field, index) => {
    acc[field] = toNumber(source[SLOTS[index] as string], field);
    return acc;
  }, {} as Attributes);
}

/**
 * Reinterpreta os seis números para goleiros (ARCHITECTURE §9).
 *
 * A fonte entrega os atributos de GK nos mesmos slots dos jogadores de
 * linha, com os rótulos errados. Yashin aparece com SHO 89 e DEF 60 —
 * números que só fazem sentido como Handling 89 e Speed 60.
 *
 *   PAC -> diving        DRI -> reflexes
 *   SHO -> handling      DEF -> speed
 *   PAS -> kicking       PHY -> positioning
 */
export function toGoalkeeperAttributes(
  attributes: Attributes,
): GoalkeeperAttributes {
  return {
    diving: attributes.pace,
    handling: attributes.shooting,
    kicking: attributes.passing,
    reflexes: attributes.dribbling,
    speed: attributes.defending,
    positioning: attributes.physical,
  };
}
