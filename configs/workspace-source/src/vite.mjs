import { defaultClientConditions, defaultServerConditions } from 'vite';

import { withWorkspaceSourceCondition } from './conditions.mjs';

/** Set by Vitest before it loads a config. */
const isVitest = process.env.VITEST !== undefined;

/**
 * Vite / Vitest `resolve` settings that prefer workspace TypeScript sources, for both client
 * and SSR (Vitest's node environment) resolution. Spread into the config next to `plugins`.
 */
export const withWorkspaceSourceResolve = () => ({
  resolve: {
    conditions: withWorkspaceSourceCondition(defaultClientConditions),
  },
  ssr: {
    resolve: {
      // Vitest also hands these to Node as `--conditions`; `module` would make Node pick
      // bundler-only ESM builds, so Vitest leaves it out. Server builds keep it: bundled
      // dependencies such as tslib only resolve to working ESM through `module`.
      conditions: withWorkspaceSourceCondition(
        isVitest ? defaultServerConditions.filter((condition) => condition !== 'module') : defaultServerConditions,
      ),
    },
  },
});
