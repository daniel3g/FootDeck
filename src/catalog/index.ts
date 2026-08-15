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
const cards = (payload as { cards: NormalizedCard[] }).cards;

export const catalog: CardRepository = new InMemoryCardRepository(cards);

export const catalogSize = cards.length;

export { InMemoryCardRepository } from './repository.js';
export * from './types.js';
