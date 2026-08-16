import { catalogCollectedAt } from '../../catalog/index.js';
import type { CatalogCard } from '../../catalog/types.js';
import { toGoalkeeperAttributes } from '../../normalization/attributes.js';
import type { Card } from './cards.schemas.js';

/**
 * Converte o registro interno na representação pública (ARCHITECTURE §16).
 *
 * A resposta não espelha a estrutura interna de propósito: agrupa atributos,
 * imagens, preços e flags, e — o ponto que importa — troca o bloco
 * `attributes` por `goalkeeper` quando a carta é de goleiro, porque os
 * mesmos seis números têm significado diferente ali.
 *
 * `search_text` e `sort_name` são índices internos e nunca vazam.
 */
export function presentCard(card: CatalogCard): Card {
  const attributes = {
    pace: card.pace,
    shooting: card.shooting,
    passing: card.passing,
    dribbling: card.dribbling,
    defending: card.defending,
    physical: card.physical,
  };

  const presented: Card = {
    id: card.id,
    source: card.source,
    source_id: card.source_id,
    game: card.game,
    season: card.season,

    name: card.name,
    rating: card.rating,
    version: card.version,
    club: card.club,
    nation: card.nation,
    league: card.league,

    position: card.position,
    alt_positions: card.alt_positions,
    alt_positions_hidden: card.alt_positions_hidden,
    is_goalkeeper: card.is_goalkeeper,

    images: {
      player: card.player_image_url,
      player_small: card.player_image_small_url,
      card: card.card_image_url,
      card_small: card.card_image_small_url,
    },

    prices: {
      playstation: card.price_ps,
      pc: card.price_pc,
      reference: card.reference_price,
      updated_at: catalogCollectedAt,
    },

    flags: {
      is_complete: card.is_complete,
      has_player_image: card.has_player_image,
      is_tradeable: card.is_tradeable,
    },

    source_url: card.source_url,
  };

  // Atribuição condicional em vez de spread: sob exactOptionalPropertyTypes,
  // um campo ausente e um campo com valor undefined são coisas diferentes.
  if (card.is_goalkeeper) {
    presented.goalkeeper = toGoalkeeperAttributes(attributes);
  } else {
    presented.attributes = attributes;
  }

  return presented;
}
