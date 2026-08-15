import { describe, expect, it } from 'vitest';
import { parsePosition } from '../../src/normalization/positions.js';

describe('parsePosition', () => {
  it('separa principal e alternativas', () => {
    const r = parsePosition('ST++LM, LW');

    expect(r.position).toBe('ST');
    expect(r.alt_positions).toEqual(['LM', 'LW']);
    expect(r.alt_positions_hidden).toBe(0);
  });

  it('aceita "++" sem alternativas', () => {
    const r = parsePosition('GK++');

    expect(r.position).toBe('GK');
    expect(r.alt_positions).toEqual([]);
  });

  it('aceita string sem o separador', () => {
    // Uma carta do dataset vem como "GK" puro.
    const r = parsePosition('GK');

    expect(r.position).toBe('GK');
    expect(r.alt_positions).toEqual([]);
  });

  it('lê "+N" como contagem de alternativas ocultas, não como posição', () => {
    const r = parsePosition('CAM++RM, CM, LM, +3');

    expect(r.position).toBe('CAM');
    expect(r.alt_positions).toEqual(['RM', 'CM', 'LM']);
    expect(r.alt_positions_hidden).toBe(3);
  });

  it('trata o "+1" mais comum do dataset', () => {
    const r = parsePosition('LW++RM, LM, RW, +1');

    expect(r.alt_positions).toEqual(['RM', 'LM', 'RW']);
    expect(r.alt_positions_hidden).toBe(1);
  });

  it('ignora espaços e tokens vazios', () => {
    const r = parsePosition('  CB ++ LB ,, RB  ');

    expect(r.position).toBe('CB');
    expect(r.alt_positions).toEqual(['LB', 'RB']);
  });

  it('não repete a posição principal entre as alternativas', () => {
    const r = parsePosition('ST++ST, CAM');
    expect(r.alt_positions).toEqual(['CAM']);
  });

  it('não duplica alternativas repetidas', () => {
    const r = parsePosition('CM++CAM, CAM');
    expect(r.alt_positions).toEqual(['CAM']);
  });

  it('reporta token desconhecido em vez de descartá-lo em silêncio', () => {
    const r = parsePosition('ST++XYZ, LW');

    expect(r.alt_positions).toEqual(['LW']);
    expect(r.unknown).toEqual(['XYZ']);
  });

  it('rejeita posição principal desconhecida', () => {
    expect(() => parsePosition('SW++CB')).toThrow(/desconhecida/i);
  });

  it('rejeita entrada vazia', () => {
    expect(() => parsePosition('')).toThrow(/vazia/i);
    expect(() => parsePosition(undefined)).toThrow(/vazia/i);
  });
});
