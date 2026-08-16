import fs from 'node:fs/promises';
import path from 'node:path';
import { normalizeCard } from '../src/normalization/card.js';
import type { NormalizedCard, RawCard } from '../src/normalization/types.js';

/**
 * cards.json bruto -> cards normalizado + relatório.
 *
 * Sem rede e sem banco (ARCHITECTURE §18): recebe JSON, devolve JSON.
 * É o que permite validar as 1200 cartas sem subir infraestrutura.
 *
 *   npm run normalize
 */

const ROOT = path.resolve(import.meta.dirname, '..');
const INPUT = path.join(ROOT, 'data', 'cards.json');
const OUT_DIR = path.join(ROOT, 'data', 'normalized');
const OUT_CARDS = path.join(OUT_DIR, 'cards.json');
const OUT_REPORT = path.join(OUT_DIR, 'report.json');

interface Failure {
  source_id: string;
  name: string;
  field: string;
  message: string;
}

function count<T>(
  items: T[],
  key: (item: T) => string,
): Record<string, number> {
  const tally: Record<string, number> = {};
  for (const item of items) {
    const k = key(item);
    tally[k] = (tally[k] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(tally).sort((a, b) => b[1] - a[1]));
}

async function main(): Promise<void> {
  const payload = JSON.parse(await fs.readFile(INPUT, 'utf8')) as {
    cards?: RawCard[];
    generated_at?: string;
  };
  const raw = payload.cards ?? [];

  // Quando a FONTE foi coletada — diferente de quando a normalização rodou.
  // É esta a data dos preços; normalizar de novo não os torna mais atuais.
  const collectedAt = payload.generated_at ?? null;

  const cards: NormalizedCard[] = [];
  const failures: Failure[] = [];
  const warnings: string[] = [];

  for (const item of raw) {
    try {
      const result = normalizeCard(item);
      cards.push(result.card);
      for (const warning of result.warnings) {
        warnings.push(`[${result.card.source_id}] ${warning}`);
      }
    } catch (error) {
      const err = error as Error & { field?: string };
      failures.push({
        source_id: item.id ?? '(sem id)',
        name: item.name ?? '(sem nome)',
        field: err.field ?? '(desconhecido)',
        message: err.message,
      });
    }
  }

  const goalkeepers = cards.filter((c) => c.is_goalkeeper);
  const prices = cards
    .map((c) => c.reference_price)
    .filter((p): p is number => p !== null)
    .sort((a, b) => a - b);

  const report = {
    generated_at: new Date().toISOString(),
    collected_at: collectedAt,
    input: path.relative(ROOT, INPUT),

    raw_cards: raw.length,
    normalized: cards.length,
    failed: failures.length,
    warnings: warnings.length,

    complete: cards.filter((c) => c.is_complete).length,
    tradeable: cards.filter((c) => c.is_tradeable).length,
    without_player_image: cards.filter((c) => !c.has_player_image).length,
    without_price: cards.filter((c) => !c.has_price).length,

    goalkeepers: goalkeepers.length,
    with_truncated_alt_positions: cards.filter(
      (c) => c.alt_positions_hidden > 0,
    ).length,
    without_alt_positions: cards.filter((c) => c.alt_positions.length === 0)
      .length,

    seasons: count(cards, (c) => String(c.season)),
    positions: count(cards, (c) => c.position),
    ratings: count(cards, (c) => String(c.rating)),

    reference_price: {
      min: prices[0] ?? null,
      median: prices[Math.floor(prices.length / 2)] ?? null,
      max: prices.at(-1) ?? null,
    },

    failures: failures.slice(0, 50),
    warning_samples: warnings.slice(0, 50),
  };

  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(
    OUT_CARDS,
    JSON.stringify(
      {
        generated_at: report.generated_at,
        collected_at: collectedAt,
        total: cards.length,
        cards,
      },
      null,
      2,
    ),
    'utf8',
  );
  await fs.writeFile(OUT_REPORT, JSON.stringify(report, null, 2), 'utf8');

  console.log('');
  console.log('  NORMALIZAÇÃO');
  console.log('  ─────────────────────────────────────');
  console.log(`  recebidas            ${report.raw_cards}`);
  console.log(`  normalizadas         ${report.normalized}`);
  console.log(`  falhas               ${report.failed}`);
  console.log(`  avisos               ${report.warnings}`);
  console.log('');
  console.log(`  completas            ${report.complete}`);
  console.log(`  negociáveis          ${report.tradeable}`);
  console.log(`  sem imagem           ${report.without_player_image}`);
  console.log(`  sem preço            ${report.without_price}`);
  console.log('');
  console.log(`  goleiros             ${report.goalkeepers}`);
  console.log(`  alt. truncadas       ${report.with_truncated_alt_positions}`);
  console.log('');
  console.log(`  saída                ${path.relative(ROOT, OUT_CARDS)}`);
  console.log(`  relatório            ${path.relative(ROOT, OUT_REPORT)}`);
  console.log('');

  if (failures.length > 0) {
    console.log('  Primeiras falhas:');
    for (const failure of failures.slice(0, 10)) {
      console.log(
        `    [${failure.source_id}] ${failure.name} — ${failure.message}`,
      );
    }
    console.log('');
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error('Erro fatal na normalização:', error);
  process.exit(1);
});
