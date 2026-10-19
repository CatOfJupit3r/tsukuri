import { ORPCError } from '@orpc/server';
import { em } from 'enumwaii';

import { errorCodes, errorMessages } from '@startername/common/generated/error-codes';
import type { ErrorCode } from '@startername/common/generated/error-codes';
import { handleError } from '@startername/common/helpers/error-handling.helper';

const orpcErrorKindsEnumwaii = em(['INFO', 'UNEXPECTED']);

export const ORPC_ERROR_KINDS = orpcErrorKindsEnumwaii.enum;
export type ORPCErrorKind = (typeof orpcErrorKindsEnumwaii)['~type'];

export interface iORPCErrorHandlingOptions extends ErrorOptions {
  kind?: ORPCErrorKind;
  operation?: string;
  context?: Record<string, unknown>;
}

interface iORPCErrorMetadata {
  kind: ORPCErrorKind;
  operation?: string;
  context?: Record<string, unknown>;
}

interface iUnexpectedErrorOptions {
  code?: ErrorCode;
  operation?: string;
  context?: Record<string, unknown>;
}

export class UnexpectedServerError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'UnexpectedServerError';
  }
}

const ORPC_ERROR_METADATA = Symbol.for('@startername/orpc-error-metadata');

type iORPCErrorWithMetadata = ORPCError<string, unknown> & {
  [ORPC_ERROR_METADATA]?: iORPCErrorMetadata;
};

function attachORPCErrorMetadata<T extends ORPCError<string, unknown>>(
  error: T,
  options?: iORPCErrorHandlingOptions,
): T {
  if (!options?.kind && !options?.operation && !options?.context) {
    return error;
  }

  const metadata: iORPCErrorMetadata = {
    kind: options.kind ?? ORPC_ERROR_KINDS.INFO,
    ...(options.operation ? { operation: options.operation } : {}),
    ...(options.context ? { context: options.context } : {}),
  };

  Object.defineProperty(error, ORPC_ERROR_METADATA, {
    value: metadata,
    enumerable: false,
    configurable: true,
  });

  return error;
}

function createORPCError<TCode extends string>(
  code: TCode,
  data: Record<string, unknown> | undefined,
  options?: iORPCErrorHandlingOptions,
) {
  const error = data
    ? new ORPCError(code, { data, cause: options?.cause })
    : new ORPCError(code, { cause: options?.cause });

  return attachORPCErrorMetadata(error, options);
}

export function createErrorPayload(code: ErrorCode, additionalData?: Record<string, unknown>) {
  return {
    code,
    ...additionalData,
    message: errorMessages.get(code),
  };
}

export function ORPCNotFoundError(
  code: ErrorCode,
  additionalData?: Record<string, unknown>,
  options?: iORPCErrorHandlingOptions,
) {
  return createORPCError('NOT_FOUND', createErrorPayload(code, additionalData), options);
}

export function ORPCBadRequestError(
  code: ErrorCode,
  additionalData?: Record<string, unknown>,
  options?: iORPCErrorHandlingOptions,
) {
  return createORPCError('BAD_REQUEST', createErrorPayload(code, additionalData), options);
}

export function ORPCForbiddenError(
  code: ErrorCode,
  additionalData?: Record<string, unknown>,
  options?: iORPCErrorHandlingOptions,
) {
  return createORPCError('FORBIDDEN', createErrorPayload(code, additionalData), options);
}

export function ORPCUnprocessableContentError(
  code: ErrorCode,
  additionalData?: Record<string, unknown>,
  options?: iORPCErrorHandlingOptions,
) {
  return createORPCError('UNPROCESSABLE_CONTENT', createErrorPayload(code, additionalData), options);
}

export function ORPCInternalServerError(
  code?: ErrorCode,
  additionalData?: Record<string, unknown>,
  options?: iORPCErrorHandlingOptions,
) {
  return createORPCError(
    'INTERNAL_SERVER_ERROR',
    createErrorPayload(code ?? errorCodes.INTERNAL_SERVER_ERROR, additionalData),
    options,
  );
}

export function ORPCUnauthorizedError(
  code: ErrorCode,
  additionalData?: Record<string, unknown>,
  options?: iORPCErrorHandlingOptions,
) {
  return createORPCError('UNAUTHORIZED', createErrorPayload(code, additionalData), options);
}

export function ORPCTooManyRequestsError(
  code: ErrorCode,
  additionalData?: Record<string, unknown>,
  options?: iORPCErrorHandlingOptions,
) {
  return createORPCError('TOO_MANY_REQUESTS', createErrorPayload(code, additionalData), options);
}

export function isORPCError(error: unknown): error is ORPCError<string, unknown> {
  return error instanceof ORPCError;
}

export function getORPCErrorMetadata(error: unknown): iORPCErrorMetadata | undefined {
  if (!isORPCError(error)) {
    return undefined;
  }

  return (error as iORPCErrorWithMetadata)[ORPC_ERROR_METADATA];
}

export function shouldLogORPCError(error: unknown) {
  const metadata = getORPCErrorMetadata(error);

  if (metadata) {
    return metadata.kind === ORPC_ERROR_KINDS.UNEXPECTED;
  }

  return !isORPCError(error);
}

export function rethrowUnexpectedError(error: unknown, options: iUnexpectedErrorOptions = {}): never {
  if (isORPCError(error)) {
    throw error;
  }

  throw ORPCInternalServerError(options.code ?? errorCodes.INTERNAL_SERVER_ERROR, undefined, {
    cause: error,
    kind: ORPC_ERROR_KINDS.UNEXPECTED,
    operation: options.operation,
    context: options.context,
  });
}

export function expectDefined<T>(value: T | null | undefined, message: string): T {
  if (value == null) {
    throw new UnexpectedServerError(message);
  }

  return value;
}

export async function handleUnexpectedError<T>(
  operation: () => Promise<T> | T,
  options: iUnexpectedErrorOptions = {},
): Promise<T> {
  return handleError(operation, (error) => rethrowUnexpectedError(error, options));
}
