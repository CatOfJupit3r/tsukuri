import type { InjectionToken } from 'tsyringe';
import { container } from 'tsyringe';
import { vi } from 'vitest';

/**
 * For unit tests of code that resolves from the global container: each token resolves to its fake, and an
 * unmapped token fails the test instead of building a real service.
 */
export function mockContainerResolve(fakesByToken: Iterable<[InjectionToken<unknown>, unknown]>) {
  const fakes = new Map(fakesByToken);
  return vi.spyOn(container, 'resolve').mockImplementation(((token: InjectionToken<unknown>) => {
    if (!fakes.has(token)) throw new Error(`No unit-test fake for ${String(token)}`);
    return fakes.get(token);
  }) as typeof container.resolve);
}
