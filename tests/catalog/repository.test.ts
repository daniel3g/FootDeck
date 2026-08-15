import { describe, expect, it } from 'vitest';
import { catalog, catalogSize } from '../../src/catalog/index.js';
import { cardId } from '../../src/catalog/identity.js';
import { foldText } from '../../src/catalog/text.js';

const first = catalog.list({ limit: 1 }).data[0]!;

describe('carga do catálogo', () => {
  it('carrega as 1200 cartas normalizadas', () => {
    expect(catalogSize).toBe(1200);
    expect(catalog.stats().total).toBe(1200);
  });

  it('atribui um id a toda carta', () => {
    const { data } = catalog.list({ limit: 100 });
    expect(data.every((c) => /^[0-9a-f-]{36}$/.test(c.id))).toBe(true);
  });

  it('não colide ids em todo o catálogo', () => {
    const { data } = catalog.list({ limit: 10_000 });
    expect(new Set(data.map((c) => c.id)).size).toBe(1200);
  });
});

describe('cardId', () => {
  it('é determinístico', () => {
    expect(cardId('futbin', '25561')).toBe(cardId('futbin', '25561'));
  });

  it('distingue fontes diferentes com o mesmo id', () => {
    expect(cardId('futbin', '1')).not.toBe(cardId('sofifa', '1'));
  });

  it('produz um UUID v5 bem formado', () => {
    expect(cardId('futbin', '25561')).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });
});

describe('busca', () => {
  it('ignora acentos', () => {
    // O catálogo tem Ibrahimović; quase ninguém digita o ć.
    const { data } = catalog.list({ search: 'ibrahimovic', limit: 100 });
    expect(data.length).toBeGreaterThan(0);
    expect(data.every((c) => foldText(c.name).includes('ibrahimovic'))).toBe(
      true,
    );
  });

  it('ignora caixa', () => {
    const a = catalog.list({ search: 'RONALDO' }).meta.total;
    const b = catalog.list({ search: 'ronaldo' }).meta.total;
    expect(a).toBe(b);
    expect(a).toBeGreaterThan(0);
  });

  it('procura também em clube e versão', () => {
    expect(catalog.list({ search: 'barcelona' }).meta.total).toBeGreaterThan(0);
    expect(catalog.list({ search: 'futties' }).meta.total).toBeGreaterThan(0);
  });

  it('devolve coleção vazia sem quebrar', () => {
    const page = catalog.list({ search: 'zzzznaoexiste' });
    expect(page.data).toEqual([]);
    expect(page.meta.total).toBe(0);
    expect(page.meta.total_pages).toBe(1);
  });
});

describe('filtros', () => {
  it('filtra por faixa de rating', () => {
    const { data } = catalog.list({ min_rating: 98, limit: 500 });
    expect(data.length).toBeGreaterThan(0);
    expect(data.every((c) => c.rating >= 98)).toBe(true);
  });

  it('filtra por posição primária', () => {
    const { data } = catalog.list({ position: ['GK'], limit: 500 });
    expect(data).toHaveLength(53);
    expect(data.every((c) => c.position === 'GK')).toBe(true);
  });

  it('aceita várias posições', () => {
    const { meta } = catalog.list({ position: ['GK', 'CB'] });
    expect(meta.total).toBe(53 + 163);
  });

  it('plays_as inclui posições alternativas', () => {
    const primary = catalog.list({ position: ['LW'] }).meta.total;
    const any = catalog.list({ plays_as: ['LW'] }).meta.total;
    expect(any).toBeGreaterThan(primary);
  });

  it('filtra por liga ignorando acento', () => {
    const a = catalog.list({ league: ['Trendyol Süper Lig'] }).meta.total;
    const b = catalog.list({ league: ['Trendyol Super Lig'] }).meta.total;
    expect(a).toBe(b);
    expect(a).toBe(29);
  });

  it('filtra pelas flags de qualidade', () => {
    expect(catalog.list({ is_complete: true }).meta.total).toBe(935);
    expect(catalog.list({ has_image: false }).meta.total).toBe(65);
    expect(catalog.list({ is_tradeable: true }).meta.total).toBe(980);
  });

  it('filtra por faixa de preço, excluindo quem não tem preço', () => {
    const { data } = catalog.list({ min_price: 1_000_000, limit: 500 });
    expect(data.every((c) => (c.reference_price ?? 0) >= 1_000_000)).toBe(true);
    expect(data.every((c) => c.reference_price !== null)).toBe(true);
  });

  it('combina filtros', () => {
    const { data } = catalog.list({
      league: ['Premier League'],
      min_rating: 97,
      limit: 500,
    });
    expect(
      data.every((c) => c.league === 'Premier League' && c.rating >= 97),
    ).toBe(true);
  });
});

describe('goleiros nos filtros de atributo', () => {
  it('min_pace não retorna goleiros por padrão', () => {
    // Comparar Diving com Pace não tem significado (ARCHITECTURE §9).
    const { data } = catalog.list({ min_pace: 80, limit: 2000 });
    expect(data.length).toBeGreaterThan(0);
    expect(data.some((c) => c.is_goalkeeper)).toBe(false);
  });

  it('include_goalkeepers=true traz goleiros de volta', () => {
    const semGK = catalog.list({ min_pace: 80 }).meta.total;
    const comGK = catalog.list({
      min_pace: 80,
      include_goalkeepers: true,
    }).meta.total;
    expect(comGK).toBeGreaterThan(semGK);
  });

  it('filtros de goleiro só retornam goleiros', () => {
    const { data } = catalog.list({ min_diving: 85, limit: 500 });
    expect(data.length).toBeGreaterThan(0);
    expect(data.every((c) => c.is_goalkeeper)).toBe(true);
  });

  it('min_diving lê o mesmo campo físico que min_pace', () => {
    const { data } = catalog.list({ min_diving: 90, limit: 500 });
    expect(data.every((c) => (c.pace ?? 0) >= 90)).toBe(true);
  });

  it('include_goalkeepers=false exclui goleiros sempre', () => {
    const { data } = catalog.list({
      include_goalkeepers: false,
      limit: 2000,
    });
    expect(data.some((c) => c.is_goalkeeper)).toBe(false);
  });
});

describe('ordenação', () => {
  it('ordena por rating decrescente', () => {
    const { data } = catalog.list({ sort: 'rating', order: 'desc', limit: 50 });
    for (let i = 1; i < data.length; i += 1) {
      expect(data[i - 1]!.rating).toBeGreaterThanOrEqual(data[i]!.rating);
    }
  });

  it('coloca cartas sem preço por último em ambas as direções', () => {
    // 220 cartas sem preço não podem liderar "mais caras".
    for (const order of ['asc', 'desc'] as const) {
      const { data } = catalog.list({
        sort: 'reference_price',
        order,
        limit: 30,
      });
      expect(data.every((c) => c.reference_price !== null)).toBe(true);
    }
  });

  it('lista as cartas sem preço somente no fim', () => {
    const { data } = catalog.list({
      sort: 'reference_price',
      order: 'desc',
      limit: 2000,
    });
    const firstNull = data.findIndex((c) => c.reference_price === null);
    expect(firstNull).toBe(980);
    expect(data.slice(firstNull).every((c) => c.reference_price === null)).toBe(
      true,
    );
  });

  it('ordena nomes ignorando acento e caixa', () => {
    // "Álvarez" precisa cair junto de "Alvarez", não depois de "Zidane".
    const { data } = catalog.list({ sort: 'name', order: 'asc', limit: 2000 });
    const keys = data.map((c) => foldText(c.name));
    expect(keys).toEqual([...keys].sort());
  });

  it('inverte a ordem dos nomes com order=desc', () => {
    const asc = catalog.list({ sort: 'name', order: 'asc', limit: 5 }).data;
    const desc = catalog.list({
      sort: 'name',
      order: 'desc',
      limit: 2000,
    }).data;
    expect(desc.at(-1)!.id).toBe(asc[0]!.id);
  });

  it('é estável: paginação não repete nem perde cartas', () => {
    const seen = new Set<string>();
    let page = 1;

    while (page <= 12) {
      const { data } = catalog.list({
        sort: 'rating',
        order: 'desc',
        page,
        limit: 100,
      });
      for (const card of data) seen.add(card.id);
      page += 1;
    }

    expect(seen.size).toBe(1200);
  });
});

describe('paginação', () => {
  it('calcula o meta corretamente', () => {
    const { meta } = catalog.list({ page: 2, limit: 50 });
    expect(meta).toEqual({ page: 2, limit: 50, total: 1200, total_pages: 24 });
  });

  it('página além do fim devolve vazio, não erro', () => {
    const { data, meta } = catalog.list({ page: 999, limit: 20 });
    expect(data).toEqual([]);
    expect(meta.total).toBe(1200);
  });

  it('páginas consecutivas não se sobrepõem', () => {
    const a = catalog.list({ sort: 'rating', page: 1, limit: 20 }).data;
    const b = catalog.list({ sort: 'rating', page: 2, limit: 20 }).data;
    const ids = new Set(a.map((c) => c.id));
    expect(b.some((c) => ids.has(c.id))).toBe(false);
  });
});

describe('busca por identificador', () => {
  it('encontra por id interno', () => {
    expect(catalog.findById(first.id)?.id).toBe(first.id);
  });

  it('devolve null para id inexistente', () => {
    expect(catalog.findById('nao-existe')).toBeNull();
  });

  it('encontra pelo id da fonte', () => {
    const found = catalog.findBySource('futbin', first.source_id);
    expect(found?.id).toBe(first.id);
  });

  it('busca em lote preserva a ordem pedida', () => {
    const { data } = catalog.list({ limit: 3 });
    const ids = data.map((c) => c.id).reverse();
    expect(catalog.findManyByIds(ids).map((c) => c.id)).toEqual(ids);
  });

  it('busca em lote omite ids inexistentes em vez de falhar', () => {
    const found = catalog.findManyByIds([first.id, 'inexistente']);
    expect(found).toHaveLength(1);
    expect(found[0]!.id).toBe(first.id);
  });
});

describe('facets e stats', () => {
  it('conta ligas em ordem decrescente', () => {
    const leagues = catalog.facets('league');
    expect(leagues[0]).toEqual({ value: 'Premier League', count: 243 });
    expect(leagues).toHaveLength(42);
  });

  it('conta posições', () => {
    const positions = catalog.facets('position');
    expect(positions).toHaveLength(12);
    expect(positions.reduce((sum, p) => sum + p.count, 0)).toBe(1200);
  });

  it('omite valores nulos das facetas', () => {
    // 3 Ícones têm version vazia.
    const versions = catalog.facets('version');
    expect(versions.reduce((sum, v) => sum + v.count, 0)).toBe(1197);
  });

  it('resume o catálogo', () => {
    const stats = catalog.stats();
    expect(stats.complete).toBe(935);
    expect(stats.goalkeepers).toBe(53);
    expect(stats.rating).toEqual({ min: 92, max: 99 });
    expect(stats.seasons).toEqual([26]);
  });
});
