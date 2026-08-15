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
});
