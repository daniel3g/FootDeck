import payload from '../../data/normalized/cards.json' with { type: 'json' };
import type { NormalizedCard } from '../normalization/types.js';
import { InMemoryCardRepository } from './repository.js';
import type { CardRepository } from './types.js';

/**
 * Carga do catálogo (ARCHITECTURE §5).
 *
 * O import é estático de propósito: sendo analisável em tempo de build, o
 * bundler da Vercel não tem como deixar o arquivo de fora do deploy. Ler
 * o mesmo JSON com `fs` funcionaria localmente e poderia falhar em
 * produção — a pior categoria de bug.
 *
 * A construção acontece uma vez, na inicialização do módulo. Como o
 * processo atende várias requisições, o custo é amortizado.
 */
const source = payload as {
  cards: NormalizedCard[];
  generated_at: string;
  collected_at: string | null;
};

export const catalog: CardRepository = new InMemoryCardRepository(source.cards);

export const catalogSize = source.cards.length;

/** Quando a normalização rodou. */
export const catalogGeneratedAt = source.generated_at;

/**
 * Quando os preços foram coletados da fonte — não quando o catálogo foi
 * normalizado. Re-rodar a normalização não torna um preço mais atual, e
 * o consumidor precisa disso para não tratá-los como cotação ao vivo.
 */
export const catalogCollectedAt = source.collected_at ?? source.generated_at;

export { InMemoryCardRepository } from './repository.js';
export * from './types.js';
