import { describe, expect, it } from 'vitest';
import { app } from '../../src/app.js';

const get = async <T>(path: string): Promise<{ status: number; body: T }> => {
  const res = await app.request(path);
  return { status: res.status, body: (await res.json()) as T };
};

interface CardBody {
  id: string;
  name: string;
  position: string;
  is_goalkeeper: boolean;
  rating: number;
  league: string | null;
  attributes?: Record<string, number | null>;
  goalkeeper?: Record<string, number | null>;
  images: Record<string, string | null>;
  prices: Record<string, number | string | null>;
  flags: Record<string, boolean>;
  search_text?: unknown;
  sort_name?: unknown;
}

interface ListBody {
  data: CardBody[];
  meta: { page: number; limit: number; total: number; total_pages: number };
}

interface ErrorBody {
  error: { code: string; message: string };
}

const BASE = '/api/v1/cards';

describe('GET /cards', () => {
  it('devolve a primeira página com o meta correto', async () => {
    const { status, body } = await get<ListBody>(BASE);

    expect(status).toBe(200);
    expect(body.data).toHaveLength(20);
    expect(body.meta).toEqual({
      page: 1,
      limit: 20,
      total: 1200,
      total_pages: 60,
    });
  });

  it('respeita page e limit', async () => {
    const { body } = await get<ListBody>(`${BASE}?page=3&limit=5`);

    expect(body.data).toHaveLength(5);
    expect(body.meta.page).toBe(3);
    expect(body.meta.total_pages).toBe(240);
  });

  it('recusa limit acima do máximo', async () => {
    const { status, body } = await get<ErrorBody>(`${BASE}?limit=500`);

    expect(status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('é cacheável na borda', async () => {
    const res = await app.request(BASE);
    expect(res.headers.get('cache-control')).toContain('s-maxage=86400');
  });
});

describe('filtros via query string', () => {
  it('filtra por posição', async () => {
    const { body } = await get<ListBody>(`${BASE}?position=GK&limit=100`);

    expect(body.meta.total).toBe(53);
    expect(body.data.every((c) => c.position === 'GK')).toBe(true);
  });

  it('aceita lista separada por vírgula', async () => {
    const { body } = await get<ListBody>(`${BASE}?position=GK,CB`);
    expect(body.meta.total).toBe(216);
  });

  it('rejeita posição fora da allowlist', async () => {
    const { status, body } = await get<ErrorBody>(`${BASE}?position=XYZ`);

    expect(status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('combina faixa de rating e liga', async () => {
    const { body } = await get<ListBody>(
      `${BASE}?min_rating=97&league=Premier%20League&limit=100`,
    );

    expect(
      body.data.every((c) => c.rating >= 97 && c.league === 'Premier League'),
    ).toBe(true);
  });

  it('busca sem acento', async () => {
    const { body } = await get<ListBody>(`${BASE}?search=ibrahimovic`);
    expect(body.meta.total).toBeGreaterThan(0);
  });

  it('interpreta booleanos da query string', async () => {
    const { body } = await get<ListBody>(`${BASE}?is_complete=true`);
    expect(body.meta.total).toBe(935);
  });

  it('rejeita booleano malformado', async () => {
    const { status } = await get<ErrorBody>(`${BASE}?is_complete=sim`);
    expect(status).toBe(400);
  });
});

describe('regra dos goleiros na API', () => {
  it('min_pace não traz goleiros', async () => {
    const { body } = await get<ListBody>(`${BASE}?min_pace=85&limit=100`);
    expect(body.data.some((c) => c.is_goalkeeper)).toBe(false);
  });

  it('include_goalkeepers=true muda o total', async () => {
    const sem = await get<ListBody>(`${BASE}?min_pace=85`);
    const com = await get<ListBody>(
      `${BASE}?min_pace=85&include_goalkeepers=true`,
    );
    expect(com.body.meta.total).toBeGreaterThan(sem.body.meta.total);
  });

  it('min_reflexes retorna somente goleiros', async () => {
    const { body } = await get<ListBody>(`${BASE}?min_reflexes=85&limit=100`);

    expect(body.meta.total).toBeGreaterThan(0);
    expect(body.data.every((c) => c.is_goalkeeper)).toBe(true);
  });
});

describe('ordenação', () => {
  it('ordena por preço sem deixar cartas sem preço na frente', async () => {
    const { body } = await get<ListBody>(
      `${BASE}?sort=reference_price&order=desc&limit=20`,
    );
    expect(body.data.every((c) => c.prices.reference !== null)).toBe(true);
  });

  it('rejeita campo de ordenação fora da allowlist', async () => {
    const { status } = await get<ErrorBody>(`${BASE}?sort=search_text`);
    expect(status).toBe(400);
  });
});

describe('busca em lote por IDs', () => {
  it('devolve só as cartas pedidas', async () => {
    const { body: list } = await get<ListBody>(`${BASE}?limit=3`);
    const ids = list.data.map((c) => c.id);

    const { body } = await get<ListBody>(`${BASE}?ids=${ids.join(',')}`);

    expect(body.meta.total).toBe(3);
    expect(body.data.map((c) => c.id).sort()).toEqual([...ids].sort());
  });

  it('ignora IDs inexistentes em vez de falhar', async () => {
    const { status, body } = await get<ListBody>(`${BASE}?ids=nao,existe`);

    expect(status).toBe(200);
    expect(body.meta.total).toBe(0);
  });

  it('recusa IDs demais com o código do contrato', async () => {
    const ids = Array.from({ length: 101 }, (_, i) => `id-${i}`).join(',');
    const { status, body } = await get<ErrorBody>(`${BASE}?ids=${ids}`);

    expect(status).toBe(400);
    expect(body.error.code).toBe('TOO_MANY_IDS');
  });
});

describe('carta individual', () => {
  it('busca pelo id interno', async () => {
    const { body: list } = await get<ListBody>(`${BASE}?limit=1`);
    const id = list.data[0]!.id;

    const { status, body } = await get<{ data: CardBody }>(`${BASE}/${id}`);

    expect(status).toBe(200);
    expect(body.data.id).toBe(id);
  });

  it('devolve 404 no formato do contrato', async () => {
    const { status, body } = await get<ErrorBody>(`${BASE}/nao-existe`);

    expect(status).toBe(404);
    expect(body.error.code).toBe('CARD_NOT_FOUND');
  });

  it('busca pelo id da fonte', async () => {
    const { status, body } = await get<{ data: CardBody }>(
      `${BASE}/source/futbin/25561`,
    );

    expect(status).toBe(200);
    expect(body.data.name).toContain('Rodrigo');
  });

  it('404 para fonte desconhecida', async () => {
    const { status } = await get<ErrorBody>(`${BASE}/source/sofifa/1`);
    expect(status).toBe(404);
  });
});

describe('representação pública', () => {
  it('agrupa atributos, imagens, preços e flags', async () => {
    const { body } = await get<ListBody>(`${BASE}?position=ST&limit=1`);
    const card = body.data[0]!;

    expect(card.attributes).toBeDefined();
    expect(card.goalkeeper).toBeUndefined();
    expect(Object.keys(card.images).sort()).toEqual([
      'card',
      'card_small',
      'player',
      'player_small',
    ]);
    expect(card.prices).toHaveProperty('reference');
    expect(card.prices).toHaveProperty('updated_at');
    expect(card.flags).toHaveProperty('is_complete');
  });

  it('troca attributes por goalkeeper nos goleiros', async () => {
    const { body } = await get<ListBody>(`${BASE}?position=GK&limit=1`);
    const card = body.data[0]!;

    expect(card.goalkeeper).toBeDefined();
    expect(card.attributes).toBeUndefined();
    expect(Object.keys(card.goalkeeper!).sort()).toEqual([
      'diving',
      'handling',
      'kicking',
      'positioning',
      'reflexes',
      'speed',
    ]);
  });

  it('não vaza os índices internos', async () => {
    const { body } = await get<ListBody>(`${BASE}?limit=5`);

    for (const card of body.data) {
      expect(card.search_text).toBeUndefined();
      expect(card.sort_name).toBeUndefined();
    }
  });
});

describe('metadados', () => {
  it('lista ligas com contagem', async () => {
    const { status, body } = await get<{
      data: { value: string; count: number }[];
    }>('/api/v1/leagues');

    expect(status).toBe(200);
    expect(body.data[0]).toEqual({ value: 'Premier League', count: 243 });
  });

  it('expõe as demais facetas', async () => {
    for (const path of ['clubs', 'versions', 'nations', 'positions']) {
      const { status, body } = await get<{ data: unknown[] }>(
        `/api/v1/${path}`,
      );
      expect(status).toBe(200);
      expect(body.data.length).toBeGreaterThan(0);
    }
  });

  it('resume o catálogo', async () => {
    const { body } = await get<{
      data: {
        total: number;
        complete: number;
        generated_at: string;
        collected_at: string;
      };
    }>('/api/v1/stats');

    expect(body.data.total).toBe(1200);
    expect(body.data.complete).toBe(935);
    expect(body.data.generated_at).toBeTruthy();
    expect(body.data.collected_at).toBeTruthy();
  });

  it('separa a data da coleta da data da normalização', async () => {
    // Re-normalizar não torna um preço mais atual. Confundir as duas datas
    // faria o consumidor achar que os preços são de hoje.
    const { body } = await get<{
      data: { generated_at: string; collected_at: string };
    }>('/api/v1/stats');

    expect(body.data.collected_at).not.toBe(body.data.generated_at);

    const { body: cards } = await get<ListBody>(`${BASE}?limit=1`);
    expect(cards.data[0]!.prices.updated_at).toBe(body.data.collected_at);
  });
});

describe('OpenAPI', () => {
  it('documenta todas as rotas do catálogo', async () => {
    const { body } = await get<{ paths: Record<string, unknown> }>(
      '/api/v1/openapi.json',
    );

    for (const path of [
      '/api/v1/cards',
      '/api/v1/cards/{id}',
      '/api/v1/cards/source/{source}/{sourceId}',
      '/api/v1/leagues',
      '/api/v1/stats',
    ]) {
      expect(body.paths[path]).toBeDefined();
    }
  });
});
