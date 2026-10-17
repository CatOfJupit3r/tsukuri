# @startername/swc-config

One SWC setup (legacy decorators + decorator metadata) for every workspace that uses tsyringe:

- dev: `node --import @swc-node/register/esm-register`, which reads the workspace `tsconfig.json`; extend `@startername/swc-config/tsconfig.decorators.json` there.
- tests: `createSwcPlugin()` from `@startername/swc-config/vitest` in `vitest.config.ts`.
- build: tsdown emits the same decorator metadata from the same tsconfig, so builds stay on tsdown.

Workspaces without decorators (web) keep Vite's defaults.
