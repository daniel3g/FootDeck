import { z } from 'zod';

/**
 * Validação do ambiente. Falha no boot, nunca em produção sob tráfego.
 *
 * Regra deliberada (ARCHITECTURE §20): CORS_ORIGIN="*" é recusado quando
 * NODE_ENV=production. A origem do jogo precisa ser explícita.
 */
const schema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    PORT: z.coerce.number().int().positive().default(3000),

    API_VERSION: z.string().default('v1'),
    CORS_ORIGIN: z.string().default('*'),

    DEFAULT_PAGE_SIZE: z.coerce.number().int().positive().default(20),
    MAX_PAGE_SIZE: z.coerce.number().int().positive().default(100),
    MAX_IDS_PER_REQUEST: z.coerce.number().int().positive().default(100),

    CACHE_MAX_AGE: z.coerce.number().int().nonnegative().default(86_400),
  })
  .refine(
    (env) => !(env.NODE_ENV === 'production' && env.CORS_ORIGIN === '*'),
    {
      message:
        'CORS_ORIGIN não pode ser "*" em produção. Informe a origem do consumidor.',
      path: ['CORS_ORIGIN'],
    },
  );

export type Env = z.infer<typeof schema>;

function load(): Env {
  const parsed = schema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map(
        (issue) => `  - ${issue.path.join('.') || '(raiz)'}: ${issue.message}`,
      )
      .join('\n');

    throw new Error(`Variáveis de ambiente inválidas:\n${issues}`);
  }

  return parsed.data;
}

export const env: Env = load();

export const isProduction = env.NODE_ENV === 'production';
