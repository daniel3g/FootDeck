import { describe, expect, it } from 'vitest';
import { parsePrice, referencePrice } from '../../src/normalization/prices.js';

describe('parsePrice', () => {
  it('converte milhões', () => {
    expect(parsePrice('1.2M')).toBe(1_200_000);
    expect(parsePrice('2.03M')).toBe(2_030_000);
    expect(parsePrice('3M')).toBe(3_000_000);
  });

  it('converte milhares', () => {
    expect(parsePrice('930K')).toBe(930_000);
    expect(parsePrice('29.5K')).toBe(29_500);
    expect(parsePrice('69.5K')).toBe(69_500);
  });

  it('converte inteiro sem unidade', () => {
    expect(parsePrice('750')).toBe(750);
  });

  it('trata "0" como ausência de preço', () => {
    // 220 cartas do dataset têm ambos os preços zerados: são as
    // não-negociáveis, não cartas que valem zero.
    expect(parsePrice('0')).toBeNull();
  });

  it('trata vazio e ausente como null', () => {
    expect(parsePrice('')).toBeNull();
    expect(parsePrice('   ')).toBeNull();
    expect(parsePrice(null)).toBeNull();
    expect(parsePrice(undefined)).toBeNull();
  });

  it('rejeita formato desconhecido em vez de adivinhar', () => {
    expect(() => parsePrice('1.2B')).toThrow(/inválido/i);
    expect(() => parsePrice('abc')).toThrow(/inválido/i);
    expect(() => parsePrice('1,2M')).toThrow(/inválido/i);
    expect(() => parsePrice('-5K')).toThrow(/inválido/i);
  });

  it('inclui o campo na mensagem de erro', () => {
    expect(() => parsePrice('xx', 'price_ps')).toThrow(/price_ps/);
  });
});

describe('referencePrice', () => {
  it('faz a média quando as duas plataformas têm preço', () => {
    expect(referencePrice(2_150_000, 2_650_000)).toBe(2_400_000);
  });

  it('arredonda média fracionária', () => {
    expect(referencePrice(100, 101)).toBe(101);
  });

  it('usa o valor existente quando só uma plataforma tem preço', () => {
    // 49 cartas do dataset têm exatamente uma plataforma zerada.
    expect(referencePrice(500_000, null)).toBe(500_000);
    expect(referencePrice(null, 300_000)).toBe(300_000);
  });

  it('devolve null quando nenhuma tem preço', () => {
    expect(referencePrice(null, null)).toBeNull();
  });
});
