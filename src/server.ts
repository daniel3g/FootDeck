import { serve } from '@hono/node-server';
import { app } from './app.js';
import { env } from './config/env.js';

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log('');
  console.log('  Football Cards API');
  console.log(`  http://localhost:${info.port}/docs`);
  console.log(`  http://localhost:${info.port}/api/${env.API_VERSION}/health`);
  console.log('');
});
