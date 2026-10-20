/**
 * Convention rules: member accessibility, no `in` narrowing, no default
 * exports, small functions, files and folders, and (for React workspaces)
 * explicit JSX rendering, shallow JSX trees and the React compiler rules. They
 * apply to every TypeScript file of every workspace.
 */
import sonarjsPlugin from 'eslint-plugin-sonarjs';

import {
  MAX_COGNITIVE_COMPLEXITY,
  MAX_DEPTH,
  MAX_FILES_PER_FOLDER,
  MAX_JSX_DEPTH,
  MAX_LINES_PER_FUNCTION,
} from './lint-limits.mjs';
import { maxFilesPerFolderRule } from './rules/max-files-per-folder.mjs';
import { noInNarrowingRule } from './rules/no-in-narrowing.mjs';

const CONVENTION_RULES_SOURCE_FILES = ['**/*.{ts,tsx}'];

const STARTER_PLUGIN = {
  rules: {
    'max-files-per-folder': maxFilesPerFolderRule,
    'no-in-narrowing': noInNarrowingRule,
  },
};

const CONVENTION_RULES = {
  '@typescript-eslint/explicit-member-accessibility': ['error', { accessibility: 'explicit' }],
  'startername/no-in-narrowing': 'error',
  'import-x/no-default-export': 'error',
  'startername/max-files-per-folder': ['error', { max: MAX_FILES_PER_FOLDER }],
  'sonarjs/cognitive-complexity': ['error', MAX_COGNITIVE_COMPLEXITY],
  'max-lines-per-function': ['error', { max: MAX_LINES_PER_FUNCTION, skipBlankLines: true, skipComments: true }],
  'max-depth': ['error', MAX_DEPTH],
};

const REACT_CONVENTION_RULES = {
  'react/jsx-no-leaked-render': ['error', { validStrategies: ['ternary'] }],
  'react/jsx-max-depth': ['error', { max: MAX_JSX_DEPTH }],
  'react-hooks/set-state-in-effect': 'error',
  'react-hooks/refs': 'error',
  'react-hooks/immutability': 'error',
  'react-hooks/preserve-manual-memoization': 'error',
  'react-hooks/static-components': 'error',
};

/**
 * @param {Object} options
 * @param {boolean} options.doesRenderReact - Whether the workspace lints React components
 * @param {string[]} [options.defaultExportFiles] - Files a tool loads through their default export (entry points
 *   such as a Worker's `fetch` handler); `import-x/no-default-export` is off for them
 * @returns {Array} ESLint flat config entries
 */
export const createConventionRulesConfig = ({ doesRenderReact, defaultExportFiles = [] }) => [
  {
    name: 'startername/convention-rules',
    files: CONVENTION_RULES_SOURCE_FILES,
    plugins: { sonarjs: sonarjsPlugin, startername: STARTER_PLUGIN },
    rules: {
      ...CONVENTION_RULES,
      ...(doesRenderReact ? REACT_CONVENTION_RULES : {}),
    },
  },
  ...(defaultExportFiles.length > 0
    ? [
        {
          name: 'startername/default-export-entry-points',
          files: defaultExportFiles,
          rules: { 'import-x/no-default-export': 'off' },
        },
      ]
    : []),
];
