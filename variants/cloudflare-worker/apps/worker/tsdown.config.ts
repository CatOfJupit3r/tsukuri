import { builtinModules } from 'node:module';
import { defineConfig, Rolldown } from 'tsdown';

import { withWorkspaceSourceCondition } from '@startername/workspace-source/conditions';

/** The Worker runtime provides these under `nodejs_compat`; everything else is bundled. */
const RUNTIME_MODULES = [...builtinModules, ...builtinModules.map((name) => `node:${name}`)];
const RUNTIME_PREFIX = 'cloudflare:';
/**
 * Bundled CommonJS packages require Node builtins through rolldown's `createRequire(import.meta.url)` helper,
 * but workerd leaves `import.meta.url` undefined. The bundle loads nothing from disk, so any absolute module
 * URL serves.
 */
const REQUIRE_HELPER_CALL = 'createRequire(import.meta.url)';
const WORKER_REQUIRE_HELPER_CALL = `createRequire(${JSON.stringify('file:///worker.mjs')})`;

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
      // Runs on the finished chunk, after rolldown added its helper; only that call changes.
      name: 'worker-require-helper',
      renderChunk: (code) => {
        const start = code.indexOf(REQUIRE_HELPER_CALL);
        if (start === -1) return null;
        if (code.includes(REQUIRE_HELPER_CALL, start + REQUIRE_HELPER_CALL.length)) {
          throw new Error(`Expected rolldown to emit "${REQUIRE_HELPER_CALL}" once`);
        }
        const edited = new Rolldown.RolldownMagicString(code).overwrite(
          start,
          start + REQUIRE_HELPER_CALL.length,
          WORKER_REQUIRE_HELPER_CALL,
        );
        // A character-level map of the edit, so composing it keeps every mapping of the chunk's sourcemap.
        return { code: edited.toString(), map: edited.generateMap({ hires: true }).toString() };
      },
    },
  ],
  inputOptions: {
    resolve: {
      // No `import` here, so `require` calls in bundled CommonJS packages still get their CommonJS builds.
      conditionNames: withWorkspaceSourceCondition(['workerd', 'worker', 'default']),
    },
  },
});
