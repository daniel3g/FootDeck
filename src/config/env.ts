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
/**
 * Trata string vazia como "não definida".
 *
 * Painéis de deploy (a Vercel entre eles) leem as chaves do .env.example e
 * criam as variáveis com valor em branco. Sem isto, `PORT=""` vira 0 e
 * derruba o boot, e `CACHE_MAX_AGE=""` vira 0 e desliga o cache em silêncio
 * — que é a falha pior das duas.
 */
const unsetIfBlank = <T extends z.ZodTypeAny>(inner: T) =>
  z.preprocess(
    (value) =>
      typeof value === 'string' && value.trim() === '' ? undefined : value,
    inner,
  );

const positiveInt = (fallback: number) =>
  unsetIfBlank(z.coerce.number().int().positive().default(fallback));

const schema = z
  .object({
    NODE_ENV: unsetIfBlank(
      z.enum(['development', 'test', 'production']).default('development'),
    ),
    PORT: positiveInt(3000),

    API_VERSION: unsetIfBlank(z.string().default('v1')),
    CORS_ORIGIN: unsetIfBlank(z.string().min(1).optional()),

    DEFAULT_PAGE_SIZE: positiveInt(20),
    MAX_PAGE_SIZE: positiveInt(100),
    MAX_IDS_PER_REQUEST: positiveInt(100),

    CACHE_MAX_AGE: unsetIfBlank(
      z.coerce.number().int().nonnegative().default(86_400),
    ),
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
