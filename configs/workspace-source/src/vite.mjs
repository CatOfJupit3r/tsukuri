import { defaultClientConditions, defaultServerConditions } from 'vite';

import { withWorkspaceSourceCondition } from './conditions.mjs';

/**
 * Vite / Vitest `resolve` settings that prefer workspace TypeScript sources, for both client
 * and SSR (Vitest's node environment) resolution. Spread into the config next to `plugins`;
 * Vitest configs pass `{ isTest: true }`.
 */
export const withWorkspaceSourceResolve = ({ isTest = false } = {}) => ({
  resolve: {
    conditions: withWorkspaceSourceCondition(defaultClientConditions),
  },
  ssr: {
    resolve: {
      // Vitest hands these to Node as `--conditions`, and `module` would make Node pick
      // bundler-only ESM builds, so tests leave it out. Server builds keep it: bundled
      // dependencies such as tslib only resolve to working ESM through `module`.
      conditions: withWorkspaceSourceCondition(
        isTest ? defaultServerConditions.filter((condition) => condition !== 'module') : defaultServerConditions,
      ),
    },
  },
});
