# @startername/lint-config

The lint rules for every workspace, declared once and run by two linters: oxlint runs every rule it supports
(translated with `@oxlint/migrate`) and ESLint runs the rest. `eslint-disable` comments apply to both.

## Use

Each workspace has an `eslint.config.mjs` and an `oxlint.config.mjs` built from the same options:

```js
// eslint.config.mjs
import { createBackendConfig } from '@startername/lint-config/eslint';

export const LINT_OPTIONS = { rootDir: import.meta.url, additionalIgnores: ['vitest.config.ts'] };

export default createBackendConfig(LINT_OPTIONS);
```

```js
// oxlint.config.mjs
import { createBackendOxlintConfig } from '@startername/lint-config/eslint';

import { LINT_OPTIONS } from './eslint.config.mjs';

export default createBackendOxlintConfig(LINT_OPTIONS);
```

`createWebConfig` and `createWebOxlintConfig` add the React, TanStack, Tailwind and accessibility rules for
`apps/web`. The root `oxlint.config.mjs` combines every workspace's oxlint config with `createWorkspacesOxlintConfig`
from `@startername/lint-config/oxlint-workspaces`.

Options besides `rootDir` and `additionalIgnores`:

- `defaultExportFiles`: files a tool loads through their default export (a Worker's `fetch` entry, for example).
  `import-x/no-default-export` is off for them. Config files (`*.config.*`) are not linted at all.
- `enumwaiiWireExceptions`: Enumwaii declarations whose values are spelled by an external system (CLI flags, MIME
  types, DOM key names, env values, ...), exempt from `enumwaii/enforce-enum-casing` and `enumwaii/no-object-em`. Each
  entry is `{ name: { regex }, reason: 'external-contract', justification }`.

## Where the rules live

- [`src/eslint.mjs`](src/eslint.mjs): the backend and web configs (airbnb, TypeScript, React, the type-checked
  Enumwaii preset, naming conventions, no `index.ts` files, no import cycles).
- [`src/convention-rules.mjs`](src/convention-rules.mjs): the size and shape conventions listed in AGENTS.md
  ("Lint Conventions"), such as folder size, complexity, depth and forbidden `export default`.
- [`src/lint-limits.mjs`](src/lint-limits.mjs): the limits those conventions use.
- [`src/rules`](src/rules): the local rules `tsukuri/max-files-per-folder` and `tsukuri/no-in-narrowing`.
- [`src/oxlint.mjs`](src/oxlint.mjs): the oxlint translation, the rules ESLint keeps because oxlint's port behaves
  differently, and the rules only oxlint runs.

Run the lint with `pnpm run lint`, or `pnpm run verify` for lint and type checks together.
