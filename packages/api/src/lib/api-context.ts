import type { InjectionToken } from 'tsyringe';
import { container } from 'tsyringe';

import type { iGeneratedContext } from '#~/generated/api-context';
import { createGeneratedContext } from '#~/generated/api-context';

interface iCoreContext {
  /** Resolves from a container created for this request. */
  resolve: <T>(token: InjectionToken<T>) => T;
}

/** Context every procedure receives: the core helpers plus what the installed modules provide. */
export type iApiContext = iCoreContext & iGeneratedContext;

export async function createApiContext(request: Request): Promise<iApiContext> {
  const requestContainer = container.createChildContainer();
  return {
    resolve: (token) => requestContainer.resolve(token),
    ...(await createGeneratedContext(request)),
  };
}
