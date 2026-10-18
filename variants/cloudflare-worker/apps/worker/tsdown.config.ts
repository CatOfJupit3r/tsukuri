import { builtinModules } from 'node:module';
import { defineConfig } from 'tsdown';

import { withWorkspaceSourceCondition } from '@startername/workspace-source/conditions';

/** The Worker runtime provides these under `nodejs_compat`; everything else is bundled. */
const RUNTIME_MODULES = [...builtinModules, ...builtinModules.map((name) => `node:${name}`)];
const RUNTIME_PREFIX = 'cloudflare:';
/**
 * Bundled CommonJS packages require Node builtins through `createRequire(import.meta.url)`, but a Worker
 * module has no URL. The bundle loads nothing from disk, so any absolute module URL serves.
 */
const WORKER_MODULE_URL = 'file:///worker.mjs';

export default defineConfig({
  entry: 'src/worker.ts',
  format: 'esm',
  platform: 'node',
  sourcemap: true,
  minify: true,
  dts: false,
  deps: {
    // wrangler serves this bundle as is (`no_bundle`), so every package has to be inside it.
    alwaysBundle: (id) => !RUNTIME_MODULES.includes(id) && !id.startsWith(RUNTIME_PREFIX),
    onlyBundle: false,
  },
  // One file: wrangler serves only the entry module, and the API loads module services with dynamic imports.
  outputOptions: { codeSplitting: false },
  plugins: [
    {
      // Runs on the finished chunk, after rolldown added its `createRequire` helper.
      name: 'worker-module-url',
      // Same lines before and after, so the existing sourcemap still applies (`map: null`).
      renderChunk: (code) => ({ code: code.replaceAll('import.meta.url', JSON.stringify(WORKER_MODULE_URL)), map: null }),
    },
  ],
  inputOptions: {
    resolve: {
      // No `import` here, so `require` calls in bundled CommonJS packages still get their CommonJS builds.
      conditionNames: withWorkspaceSourceCondition(['workerd', 'worker', 'default']),
    },
  },
});
