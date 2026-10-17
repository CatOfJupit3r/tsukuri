/**
 * Shared oxlint configuration. Each workspace's `oxlint.config.mjs` default-exports
 * `createOxlintConfig(...)`; ESLint switches off the rules enabled here (see `eslint.mjs`).
 */

const BASE_PLUGINS = ['eslint', 'typescript', 'import', 'unicorn', 'oxc', 'node', 'promise'];
const REACT_PLUGINS = ['react', 'jsx-a11y', 'react-perf'];

/**
 * @param {Object} [options]
 * @param {boolean} [options.isReact] - Enable React and JSX accessibility rules (web workspaces)
 * @param {string[]} [options.ignorePatterns] - Additional paths oxlint skips
 */
export const createOxlintConfig = ({ isReact = false, ignorePatterns = [] } = {}) => ({
  plugins: [...BASE_PLUGINS, ...(isReact ? REACT_PLUGINS : [])],
  categories: {
    correctness: 'error',
  },
  env: {
    builtin: true,
    es2024: true,
    ...(isReact ? { browser: true } : { node: true }),
  },
  ignorePatterns: ['dist/**', 'node_modules/**', 'coverage/**', ...ignorePatterns],
  rules: {
    'no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_', ignoreRestSiblings: true },
    ],
    ...(isReact ? { 'jsx-a11y/prefer-tag-over-role': 'off' } : {}),
  },
});
