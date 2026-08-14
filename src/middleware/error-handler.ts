import type { Context, ErrorHandler, NotFoundHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { ApiError } from '../errors.js';
import { isProduction } from '../config/env.js';

interface ErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

function body(code: string, message: string, details?: unknown): ErrorBody {
  const payload: ErrorBody = { error: { code, message } };
  if (details !== undefined && !isProduction) {
    payload.error.details = details;
  }
  return payload;
}

/**
 * Formato único de erro (ARCHITECTURE §15). Nenhuma rota devolve
 * erro em outro formato, e stack trace nunca vaza em produção.
 */
export const errorHandler: ErrorHandler = (err, c: Context) => {
  if (err instanceof ApiError) {
    return c.json(body(err.code, err.message, err.details), err.status as 400);
  }

  // Erros de validação do @hono/zod-openapi chegam como HTTPException.
  if (err instanceof HTTPException) {
    const code = err.status === 404 ? 'CARD_NOT_FOUND' : 'VALIDATION_ERROR';
    return c.json(body(code, err.message), err.status);
  }

  console.error('[unhandled]', err);

  return c.json(
    body(
      'INTERNAL_ERROR',
      'Internal server error',
      isProduction ? undefined : String(err),
    ),
    500,
  );
};

export const notFoundHandler: NotFoundHandler = (c: Context) =>
  c.json(body('CARD_NOT_FOUND', `Route not found: ${c.req.path}`), 404);
