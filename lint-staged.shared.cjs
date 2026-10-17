/**
 * Shared lint-staged configuration for startername monorepo
 *
 * This configuration runs linting and formatting on staged files before commit.
 * It's optimized for a monorepo structure with TypeScript/JavaScript files.
 *
 * @param {string} workspace - The workspace name (e.g., 'server', 'web', 'common')
 */
module.exports = (workspace) => ({
  '*.{ts,tsx}': [
    'oxlint',
    'eslint --fix --cache --cache-location node_modules/.cache/eslint/',
    'prettier --write',
    // Type check the specific workspace through pnpm.
    () => `pnpm --filter=${workspace} run check-types`,
  ],

  '*.{js,jsx,mjs}': ['oxlint', 'eslint --fix --cache --cache-location node_modules/.cache/eslint/', 'prettier --write'],

  '*.{json,yaml,yml,md}': ['prettier --write'],
});
