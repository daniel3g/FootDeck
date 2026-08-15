import { describe, expect, it } from 'vitest';
import { normalizeCard, parseSeason } from '../../src/normalization/card.js';
import {
  parseAttributes,
  toGoalkeeperAttributes,
} from '../../src/normalization/attributes.js';
import type { RawCard } from '../../src/normalization/types.js';

const base: RawCard = {
  id: '25561',
  name: 'Rodrigo Hernández Cascante',
  url: 'https://www.futbin.com/26/player/25561/rodrigo-hernandez-cascante',
  rating: '99',
  position: 'CDM++CM',
  version: 'Path to Glory',
  club: 'Manchester City',
  nation: 'Spain',
  league: 'Premier League',
  image: 'https://cdn3.futbin.com/small.png?s=abc',
  card_image_url: 'https://cdn3.futbin.com/card-small.png?s=abc',
  image_large: 'https://cdn.futbin.com/large.png',
  card_image_large_url: 'https://cdn.futbin.com/card-large.png',
  price_ps: '2.03M',
  price_pc: '3.2M',
  stats: { PAC: '93', SHO: '91', PAS: '99', DRI: '99', DEF: '97', PHY: '95' },
};

describe('parseSeason', () => {
  it('extrai a temporada da URL', () => {
    expect(parseSeason('https://www.futbin.com/26/player/18/ronaldo')).toBe(26);
  });

  it('falha quando a URL não tem o padrão esperado', () => {
    expect(() => parseSeason('https://exemplo.com/x')).toThrow(/temporada/i);
    expect(() => parseSeason(undefined)).toThrow(/temporada/i);
  });
});

describe('normalizeCard', () => {
  it('normaliza uma carta completa', () => {
    const { card } = normalizeCard(base);

    expect(card.source).toBe('futbin');
    expect(card.source_id).toBe('25561');
    expect(card.game).toBe('FC');
    expect(card.season).toBe(26);
    expect(card.rating).toBe(99);
    expect(card.position).toBe('CDM');
    expect(card.alt_positions).toEqual(['CM']);
    expect(card.is_goalkeeper).toBe(false);
  });

  it('converte os preços e calcula a referência', () => {
    const { card } = normalizeCard(base);

    expect(card.price_ps).toBe(2_030_000);
    expect(card.price_pc).toBe(3_200_000);
    expect(card.reference_price).toBe(2_615_000);
  });

  it('preserva as strings originais de preço', () => {
    // "2.03M" já é arredondamento da fonte; o inteiro derivado não é o
    // preço exato de mercado, então a string crua fica para auditoria.
    const { card } = normalizeCard(base);

    expect(card.price_ps_raw).toBe('2.03M');
    expect(card.price_pc_raw).toBe('3.2M');
  });

  it('mapeia as quatro variantes de imagem', () => {
    const { card } = normalizeCard(base);

    expect(card.player_image_url).toBe('https://cdn.futbin.com/large.png');
    expect(card.card_image_url).toBe('https://cdn.futbin.com/card-large.png');
    expect(card.player_image_small_url).toContain('small.png');
    expect(card.card_image_small_url).toContain('card-small.png');
  });

  it('deriva as flags de qualidade', () => {
    const { card } = normalizeCard(base);

    expect(card.has_player_image).toBe(true);
    expect(card.has_price).toBe(true);
    expect(card.is_tradeable).toBe(true);
    expect(card.is_complete).toBe(true);
  });

  it('marca carta sem imagem de jogador como incompleta', () => {
    // 65 cartas do dataset, incluindo Ícones como Maradona e Pelé.
    const { card } = normalizeCard({ ...base, image_large: '' });

    expect(card.has_player_image).toBe(false);
    expect(card.is_complete).toBe(false);
    // A arte da carta existe, então ainda é utilizável.
    expect(card.card_image_url).not.toBeNull();
  });

  it('marca carta sem preço como não negociável', () => {
    const { card } = normalizeCard({
      ...base,
      price_ps: '0',
      price_pc: '0',
    });

    expect(card.has_price).toBe(false);
    expect(card.is_tradeable).toBe(false);
    expect(card.is_complete).toBe(false);
    expect(card.reference_price).toBeNull();
  });

  it('converte strings vazias em null', () => {
    const { card } = normalizeCard({ ...base, version: '', club: '' });

    expect(card.version).toBeNull();
    expect(card.club).toBeNull();
  });

  it('preserva a string de posição original', () => {
    const { card } = normalizeCard({
      ...base,
      position: 'CAM++RM, CM, LM, +3',
    });

    expect(card.position_raw).toBe('CAM++RM, CM, LM, +3');
    expect(card.alt_positions_hidden).toBe(3);
  });

  it('rejeita campos obrigatórios ausentes', () => {
    const { name: _semNome, ...withoutName } = base;

    expect(() => normalizeCard({ ...base, id: '' })).toThrow(/id/);
    expect(() => normalizeCard(withoutName)).toThrow(/name/);
    expect(() => normalizeCard({ ...base, rating: 'x' })).toThrow(/rating/i);
  });
});

describe('goleiros', () => {
  const yashin: RawCard = {
    ...base,
    id: '999',
    name: 'Yashin',
    position: 'GK++',
    stats: { PAC: '93', SHO: '89', PAS: '75', DRI: '94', DEF: '60', PHY: '93' },
  };

  it('identifica goleiro pela posição primária', () => {
    const { card } = normalizeCard(yashin);
    expect(card.is_goalkeeper).toBe(true);
  });

  it('remapeia os seis atributos para o significado correto', () => {
    // A fonte rotula tudo como jogador de linha. "SHO 89" e "DEF 60"
    // só fazem sentido como Handling 89 e Speed 60.
    const gk = toGoalkeeperAttributes(parseAttributes(yashin.stats));

    expect(gk.diving).toBe(93);
    expect(gk.handling).toBe(89);
    expect(gk.kicking).toBe(75);
    expect(gk.reflexes).toBe(94);
    expect(gk.speed).toBe(60);
    expect(gk.positioning).toBe(93);
  });
});

describe('parseAttributes', () => {
  it('converte os seis slots', () => {
    const a = parseAttributes({
      PAC: '99',
      SHO: '98',
      PAS: '91',
      DRI: '99',
      DEF: '60',
      PHY: '84',
    });

    expect(a).toEqual({
      pace: 99,
      shooting: 98,
      passing: 91,
      dribbling: 99,
      defending: 60,
      physical: 84,
    });
  });

  it('trata atributo ausente como null', () => {
    const a = parseAttributes({ PAC: '90' });

    expect(a.pace).toBe(90);
    expect(a.shooting).toBeNull();
  });

  it('trata stats ausente por completo', () => {
    expect(parseAttributes(undefined).pace).toBeNull();
  });

  it('rejeita atributo não numérico', () => {
    expect(() => parseAttributes({ PAC: 'alto' })).toThrow(/não numérico/i);
  });
});
