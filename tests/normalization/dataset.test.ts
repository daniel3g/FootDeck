import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { normalizeCard } from '../../src/normalization/card.js';
import { POSITIONS } from '../../src/normalization/types.js';
import type { NormalizedCard, RawCard } from '../../src/normalization/types.js';

/**
 * Regressão contra o dataset real (ARCHITECTURE §21).
 *
 * Testes com dados sintéticos provam que o parser faz o que eu pensei.
 * Este prova que ele aguenta o que a fonte realmente entrega — que é
 * onde moram as surpresas.
 */

const INPUT = path.resolve(import.meta.dirname, '../../data/cards.json');

const raw: RawCard[] = JSON.parse(fs.readFileSync(INPUT, 'utf8')).cards ?? [];

const normalized: NormalizedCard[] = raw.map(
  (card) => normalizeCard(card).card,
);

describe('dataset real', () => {
  it('tem as 1200 cartas coletadas', () => {
    expect(raw).toHaveLength(1200);
  });

  it('normaliza todas sem lançar exceção', () => {
    expect(normalized).toHaveLength(1200);
  });

  it('não produz avisos de posição desconhecida', () => {
    const warnings = raw.flatMap((card) => normalizeCard(card).warnings);
    expect(warnings).toEqual([]);
  });

  it('mantém os source_id únicos', () => {
    const ids = new Set(normalized.map((c) => c.source_id));
    expect(ids.size).toBe(normalized.length);
  });

  // Os números abaixo vieram da inspeção do dataset bruto, antes de
  // existir normalizador. Se algum mudar, ou a fonte mudou ou uma regra
  // regrediu — os dois casos merecem atenção.
  it('reproduz as contagens conhecidas', () => {
    const count = (fn: (c: NormalizedCard) => boolean) =>
      normalized.filter(fn).length;

    expect(count((c) => c.is_complete)).toBe(935);
    expect(count((c) => !c.has_player_image)).toBe(65);
    expect(count((c) => !c.has_price)).toBe(220);
    expect(count((c) => c.is_goalkeeper)).toBe(53);
    expect(count((c) => c.alt_positions_hidden > 0)).toBe(238);
  });

  it('mantém todas as posições dentro da allowlist', () => {
    for (const card of normalized) {
      expect(POSITIONS).toContain(card.position);
      for (const alt of card.alt_positions) {
        expect(POSITIONS).toContain(alt);
      }
    }
  });

  it('nunca repete a principal entre as alternativas', () => {
    for (const card of normalized) {
      expect(card.alt_positions).not.toContain(card.position);
    }
  });

  it('deriva a mesma temporada para todo o catálogo', () => {
    const seasons = new Set(normalized.map((c) => c.season));
    expect([...seasons]).toEqual([26]);
  });

  it('mantém coerência entre preços e flags', () => {
    for (const card of normalized) {
      expect(card.has_price).toBe(
        card.price_ps !== null || card.price_pc !== null,
      );
      expect(card.is_tradeable).toBe(card.has_price);

      if (!card.has_price) {
        expect(card.reference_price).toBeNull();
      } else {
        expect(card.reference_price).toBeGreaterThan(0);
      }
    }
  });

  it('mantém ratings na faixa coletada', () => {
    const ratings = normalized.map((c) => c.rating);
    expect(Math.min(...ratings)).toBe(92);
    expect(Math.max(...ratings)).toBe(99);
  });

  it('preenche a arte da carta em 100% do catálogo', () => {
    // Só a foto do jogador falta em algumas; a arte nunca falta, e é o
    // que permite exibir as 1200 cartas mesmo as incompletas.
    expect(normalized.every((c) => c.card_image_url !== null)).toBe(true);
  });
});
