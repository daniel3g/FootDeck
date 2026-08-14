import { describe, expect, it } from 'vitest';
import { app } from '../src/app.js';

/** `Response.json()` devolve `unknown` sob strict; os testes declaram o formato esperado. */
const json = async <T>(res: Response): Promise<T> => (await res.json()) as T;

interface HealthBody {
  status: string;
  version: string;
  environment: string;
  uptime_seconds: number;
  timestamp: string;
}

interface ErrorBody {
  error: { code: string; message: string };
}

interface OpenApiDoc {
  info: { title: string };
  paths: Record<string, unknown>;
}

describe('GET /api/v1/health', () => {
  it('responde 200 com o corpo esperado', async () => {
    const res = await app.request('/api/v1/health');

    expect(res.status).toBe(200);

    const body = await json<HealthBody>(res);
    expect(body.status).toBe('ok');
    expect(body.environment).toBe('test');
    expect(typeof body.uptime_seconds).toBe('number');
    expect(() => new Date(body.timestamp).toISOString()).not.toThrow();
  });

  it('não é cacheável', async () => {
    const res = await app.request('/api/v1/health');
    expect(res.headers.get('cache-control')).toBe('no-store');
  });
});

describe('OpenAPI', () => {
  it('publica o documento com a rota de health', async () => {
    const res = await app.request('/api/v1/openapi.json');

    expect(res.status).toBe(200);

    const doc = await json<OpenApiDoc>(res);
    expect(doc.info.title).toBe('Football Cards API');
    expect(doc.paths['/api/v1/health']).toBeDefined();
  });

  it('serve o Swagger UI em /docs', async () => {
    const res = await app.request('/docs');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('swagger-ui');
  });
});

describe('Erros', () => {
  it('rota inexistente devolve 404 no formato do contrato', async () => {
    const res = await app.request('/api/v1/nao-existe');

    expect(res.status).toBe(404);

    const body = await json<ErrorBody>(res);
    expect(body.error.code).toBe('CARD_NOT_FOUND');
    expect(typeof body.error.message).toBe('string');
  });
});

describe('CORS', () => {
  it('responde ao preflight', async () => {
    const res = await app.request('/api/v1/health', {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://exemplo.test',
        'Access-Control-Request-Method': 'GET',
      },
    });

    expect(res.headers.get('access-control-allow-origin')).toBe('*');
  });
});
