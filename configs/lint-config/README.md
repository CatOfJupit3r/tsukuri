# @startername/lint-config

Shared lint configuration for startername monorepo projects.

- `@startername/lint-config/oxlint` – `createOxlintConfig()` for each workspace's `oxlint.config.mjs`. oxlint runs first and is fast.
- `@startername/lint-config/eslint` – `createBackendConfig()` / `createWebConfig()` for each workspace's `eslint.config.mjs`. Rules that oxlint already reports are switched off in ESLint.
