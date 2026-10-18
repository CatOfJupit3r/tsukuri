import { defaultClientConditions, defaultServerConditions } from 'vite';

import { withWorkspaceSourceCondition } from './conditions.mjs';

/**
 * Vite / Vitest `resolve` settings that prefer workspace TypeScript sources, for both client
 * and SSR (Vitest's node environment) resolution. Spread into the config next to `plugins`.
 */
export const withWorkspaceSourceResolve = (alias = {}) => ({
  resolve: {
    alias,
    conditions: withWorkspaceSourceCondition(defaultClientConditions),
  },
  ssr: {
    resolve: {
      // Vitest also hands these to Node as `--conditions`; `module` would make Node pick
      // bundler-only ESM builds, so it is left out.
      conditions: withWorkspaceSourceCondition(defaultServerConditions.filter((condition) => condition !== 'module')),
    },
  },
});
