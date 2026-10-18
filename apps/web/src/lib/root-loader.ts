import { getStoredTheme } from '#~/components/themes/theme-storage';
import { generatedRootPreloads } from '#~/generated/web-root-preloads';
import type { iRouterAppContext } from '#~/router-context';

type iRootPreload = (context: iRouterAppContext) => Promise<unknown>;

const ROOT_PRELOADS: readonly iRootPreload[] = generatedRootPreloads;

/** What the root route loads before the first render: the modules' preloads and the stored theme. */
export async function loadRoot(context: iRouterAppContext) {
  const [initialTheme] = await Promise.all([
    getStoredTheme(),
    ...ROOT_PRELOADS.map(async (preload) => preload(context)),
  ]);
  return { initialTheme };
}
