import { toastError } from '#~/components/toastifications/create-jsx-toasts';
import type { iInfoToastData } from '#~/components/toastifications/custom-jsx-toasts';
import type { CustomToastOptions } from '#~/components/toastifications/types';

/** Better Auth puts the server's message on the error's cause. */
export function toastBetterAuthError(title: string, error: Error, options?: CustomToastOptions<iInfoToastData>) {
  const cause = error.cause as { message?: string } | undefined;
  toastError(title, cause?.message ?? error.message, options);
}
