import { NormalizationError } from './types.js';

const PRICE = /^(\d+(?:\.\d+)?)([KM])?$/;

/**
 * Converte o preço da fonte para inteiro em moedas (ARCHITECTURE §13).
 *
 *   "1.2M"  -> 1200000
 *   "29.5K" ->   29500
 *   "0"     -> null      (sem preço / não negociável)
 *   ""      -> null
 *
 * Qualquer outro formato é erro explícito. Silenciar aqui produziria
 * preços errados no catálogo, que é pior do que uma importação que falha.
 */
export function parsePrice(
  raw: string | null | undefined,
  field = 'price',
): number | null {
  if (raw === null || raw === undefined) return null;

  const value = raw.trim();
  if (value === '' || value === '0') return null;

  const match = PRICE.exec(value);
  if (!match?.[1]) {
    throw new NormalizationError(
      field,
      `Formato de preço inválido em ${field}: "${raw}"`,
    );
  }

  const amount = Number(match[1]);
  const unit = match[2];
  const multiplier = unit === 'M' ? 1_000_000 : unit === 'K' ? 1_000 : 1;

  return Math.round(amount * multiplier);
}

/**
 * Preço de referência (ARCHITECTURE §13).
 *
 *   ambos existem  -> média
 *   apenas um      -> o que existe
 *   nenhum         -> null
 *
 * 49 cartas do dataset têm exatamente uma plataforma zerada; a regra do
 * meio existe para elas e não deve ser confundida com as 220 sem preço.
 */
export function referencePrice(
  ps: number | null,
  pc: number | null,
): number | null {
  if (ps !== null && pc !== null) return Math.round((ps + pc) / 2);
  return ps ?? pc;
}
