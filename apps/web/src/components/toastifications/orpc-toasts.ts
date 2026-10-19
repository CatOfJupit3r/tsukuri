import { isDefinedError } from '@orpc/client';

import { toastError } from './create-jsx-toasts';
import type { iInfoToastData } from './custom-jsx-toasts';
import type { CustomToastOptions } from './types';

const UNKNOWN_ERROR_MESSAGE = 'An unknown error occurred';

/** Shows the message of an API error, which oRPC carries for errors the contract defines. */
export function toastORPCError(title: string, error: unknown, options?: CustomToastOptions<iInfoToastData>) {
  let message = UNKNOWN_ERROR_MESSAGE;
  if (typeof error === 'string') message = error;
  else if (isDefinedError(error) || error instanceof Error) message = error.message;

  toastError(title, message, options);
}
