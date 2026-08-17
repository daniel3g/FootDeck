import { Hono } from 'hono';
import { cacheable } from '../../middleware/cache.js';
import { manualPage } from './manual.page.js';

/**
 * O manual de uso, em GET /manual.
 *
 * Fica fora do prefixo de versão, junto de /docs: é documentação, não
 * contrato. Sai do OpenAPI pela mesma razão — o documento descreve os
 * recursos JSON, e uma página HTML ali só polui o cliente gerado.
 *
 * `manual.page.ts` traz apenas o conteúdo. Head, charset e viewport são
 * responsabilidade daqui porque a mesma página também é publicada fora do
 * projeto, onde quem hospeda injeta o próprio shell — deixar o conteúdo
 * livre de shell é o que permite uma fonte só para os dois destinos.
 */
const document = [
  '<!doctype html>',
  '<html lang="pt-BR">',
  '<head>',
  '<meta charset="utf-8">',
  '<meta name="viewport" content="width=device-width, initial-scale=1">',
  '<title>Manual — Football Cards API</title>',
  '<meta name="description" content="Manual de uso da Football Cards API: rotas, parâmetros, o objeto Carta, erros e receitas.">',
  '</head>',
  '<body>',
  manualPage,
  '</body>',
  '</html>',
].join('\n');

export const manualRoutes = new Hono();

manualRoutes.use('/manual', cacheable);

manualRoutes.get('/manual', (c) => c.html(document));
