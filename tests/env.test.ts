import { describe, expect, it } from 'vitest';
import { parseEnv } from '../src/config/env.js';

describe('parseEnv', () => {
  it('aplica os defaults em desenvolvimento', () => {
    const env = parseEnv({});

    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(3000);
    expect(env.API_VERSION).toBe('v1');
    expect(env.CORS_ORIGIN).toBeUndefined();
    expect(env.CACHE_MAX_AGE).toBe(86_400);
  });

  it('converte números vindos como string', () => {
    const env = parseEnv({ PORT: '8080', MAX_PAGE_SIZE: '50' });

    expect(env.PORT).toBe(8080);
    expect(env.MAX_PAGE_SIZE).toBe(50);
  });

  it('recusa produção sem CORS_ORIGIN explícita', () => {
    // Guarda o deploy: a Vercel define NODE_ENV=production sozinha, então
    // sem esta regra a origem ficaria aberta por default, não por decisão.
    expect(() => parseEnv({ NODE_ENV: 'production' })).toThrow(/CORS_ORIGIN/);
  });

  it('aceita "*" em produção quando é escolha explícita', () => {
    const env = parseEnv({ NODE_ENV: 'production', CORS_ORIGIN: '*' });
    expect(env.CORS_ORIGIN).toBe('*');
  });

  it('aceita uma origem específica em produção', () => {
    const env = parseEnv({
      NODE_ENV: 'production',
      CORS_ORIGIN: 'https://footdeck.vercel.app',
    });
    expect(env.CORS_ORIGIN).toBe('https://footdeck.vercel.app');
  });

  it('rejeita valores inválidos com mensagem útil', () => {
    expect(() => parseEnv({ PORT: 'abc' })).toThrow(/PORT/);
    expect(() => parseEnv({ NODE_ENV: 'staging' })).toThrow(/NODE_ENV/);
  });

  describe('valores em branco', () => {
    // O painel da Vercel lê as chaves do .env.example e as cria com valor
    // vazio. Sem tratamento, PORT="" derruba o boot e CACHE_MAX_AGE=""
    // desliga o cache de borda em silêncio.
    it('trata string vazia como não definida', () => {
      const env = parseEnv({
        NODE_ENV: '',
        PORT: '',
        API_VERSION: '',
        DEFAULT_PAGE_SIZE: '',
        MAX_PAGE_SIZE: '',
        MAX_IDS_PER_REQUEST: '',
        CACHE_MAX_AGE: '',
      });

      expect(env.NODE_ENV).toBe('development');
      expect(env.PORT).toBe(3000);
      expect(env.API_VERSION).toBe('v1');
      expect(env.DEFAULT_PAGE_SIZE).toBe(20);
      expect(env.MAX_PAGE_SIZE).toBe(100);
      expect(env.MAX_IDS_PER_REQUEST).toBe(100);
      expect(env.CACHE_MAX_AGE).toBe(86_400);
    });

    it('ignora espaços em branco', () => {
      expect(parseEnv({ CACHE_MAX_AGE: '   ' }).CACHE_MAX_AGE).toBe(86_400);
    });

    it('CORS_ORIGIN em branco continua contando como ausente em produção', () => {
      expect(() =>
        parseEnv({ NODE_ENV: 'production', CORS_ORIGIN: '' }),
      ).toThrow(/CORS_ORIGIN/);
    });

    it('CACHE_MAX_AGE=0 explícito é respeitado', () => {
      // Zero continua sendo uma escolha válida — desligar o cache de
      // propósito é diferente de desligá-lo por descuido.
      expect(parseEnv({ CACHE_MAX_AGE: '0' }).CACHE_MAX_AGE).toBe(0);
    });
  });
});
