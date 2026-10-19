/**
 * Shared lint-staged configuration for startername monorepo
 *
 * This configuration runs linting and formatting on staged files before commit.
 * It's optimized for a monorepo structure with TypeScript/JavaScript files.
 */
const path = require('node:path');

const OXLINT_COMMAND = 'oxlint -c oxlint.config.mjs --fix --no-error-on-unmatched-pattern';
const ESLINT_COMMAND =
  'eslint --fix --no-warn-ignored --cache --cache-strategy content --cache-location node_modules/.cache/eslint/';
const PRETTIER_COMMAND = `prettier --write --ignore-path ${JSON.stringify(path.join(__dirname, '.gitignore'))} --ignore-path ${JSON.stringify(path.join(__dirname, '.prettierignore'))}`;

/**
 * @param {string} workspace - The workspace name (e.g., 'server', 'web', 'common')
 */
module.exports = (workspace) => ({
  '*.{ts,tsx}': [
    OXLINT_COMMAND,
    ESLINT_COMMAND,
    PRETTIER_COMMAND,
    // Type check the specific workspace through pnpm.
    () => `pnpm --filter=${workspace} run check-types`,
  ],

  '*.{js,jsx,mjs}': [OXLINT_COMMAND, ESLINT_COMMAND, PRETTIER_COMMAND],

  '*.{json,yaml,yml,md}': [PRETTIER_COMMAND],
});
