import { handle } from 'hono/vercel';
import { app } from '../src/app.js';

/**
 * Entrypoint da Vercel. Todas as rotas caem aqui via o rewrite do
 * vercel.json; o roteamento em si é do Hono.
 */
export const config = {
  runtime: 'nodejs',
};

export default handle(app);
