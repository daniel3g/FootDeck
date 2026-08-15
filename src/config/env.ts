import { z } from 'zod';

/**
 * Validação do ambiente. Falha no boot, nunca sob tráfego.
 *
 * Regra deliberada (ARCHITECTURE §20): em produção, CORS_ORIGIN precisa ser
 * definida explicitamente. "*" é uma escolha válida — o catálogo é público,
 * somente leitura e sem credenciais, então não há o que uma origem restrita
 * protegeria. O que a regra impede é a origem ficar aberta por descuido,
 * herdada de um default, em vez de por decisão.
 */
const schema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    PORT: z.coerce.number().int().positive().default(3000),

    API_VERSION: z.string().default('v1'),
    CORS_ORIGIN: z.string().min(1).optional(),

    DEFAULT_PAGE_SIZE: z.coerce.number().int().positive().default(20),
    MAX_PAGE_SIZE: z.coerce.number().int().positive().default(100),
    MAX_IDS_PER_REQUEST: z.coerce.number().int().positive().default(100),

    CACHE_MAX_AGE: z.coerce.number().int().nonnegative().default(86_400),
  })
  .refine(
    (env) => env.NODE_ENV !== 'production' || env.CORS_ORIGIN !== undefined,
    {
      message:
        'CORS_ORIGIN precisa ser definida explicitamente em produção. Use "*" para um catálogo público, ou a origem do consumidor.',
      path: ['CORS_ORIGIN'],
    },
  );

export type Env = z.infer<typeof schema>;

/** Exportada para teste: valida uma fonte arbitrária, sem tocar em process.env. */
export function parseEnv(source: Record<string, string | undefined>): Env {
  const parsed = schema.safeParse(source);

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

export const env: Env = parseEnv(process.env);

export const isProduction = env.NODE_ENV === 'production';

/** Fora de produção, a ausência de CORS_ORIGIN significa "libere tudo". */
export const corsOrigin: string = env.CORS_ORIGIN ?? '*';
