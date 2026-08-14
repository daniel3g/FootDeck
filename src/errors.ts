/**
 * Códigos de erro do contrato público (ARCHITECTURE §15).
 * A lista é fechada: o cliente pode programar contra ela.
 */
export const ERROR_CODES = {
  VALIDATION_ERROR: 400,
  CARD_NOT_FOUND: 404,
  TOO_MANY_IDS: 400,
  INTERNAL_ERROR: 500,
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;

export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details: unknown;

  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = ERROR_CODES[code];
    this.details = details;
  }
}

export const notFound = (message = 'Card not found'): ApiError =>
  new ApiError('CARD_NOT_FOUND', message);

export const validationError = (message: string, details?: unknown): ApiError =>
  new ApiError('VALIDATION_ERROR', message, details);
