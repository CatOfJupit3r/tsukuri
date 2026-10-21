/**
 * Shared ESLint Configuration Factory for startername Monorepo
 *
 * This module provides a factory function to create ESLint configurations
 * for different project types (backend, web) with consistent rules across
 * the monorepo. Each workspace gets two configs from one rule set: oxlint
 * runs every rule it implements, and ESLint keeps only the rest.
 */
import { includeIgnoreFile } from '@eslint/compat';
import js from '@eslint/js';
import enumwaiiPlugin from 'eslint-plugin-enumwaii';
import { configs, plugins, rules } from 'eslint-config-airbnb-extended';
import { rules as prettierConfigRules } from 'eslint-config-prettier';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import prettierPlugin from 'eslint-plugin-prettier';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createConventionRulesConfig } from './convention-rules.mjs';
import { createOxlintConfigFromEslintConfig, withoutOxlintRules } from './oxlint.mjs';

const [publishedEnumwaiiTypeCheckedPreset] = enumwaiiPlugin.configs['flat/recommended-type-checked'];

/**
 * Enumwaii rules of the type-checked preset. `wireExceptions` lists declarations whose values are spelled by an
 * external system (CLI flags, MIME types, DOM key names, ...), exempt from casing and object input. Each entry is
 * `{ name: { regex }, reason: 'external-contract', justification }`.
 */
const SHARED_ENUMWAII_WIRE_EXCEPTIONS = [
  {
    name: { regex: '(EventNames|MessageNames)Enumwaii$' },
    reason: 'external-contract',
    justification:
      'Payload token names travel on shared channels (event bus, BroadcastChannel, WebSocket) and carry a feature prefix so features cannot collide.',
  },
];

const createEnumwaiiRules = (wireExceptions) => {
  const ignore = [...SHARED_ENUMWAII_WIRE_EXCEPTIONS, ...wireExceptions];

  return {
    ...publishedEnumwaiiTypeCheckedPreset.rules,
    'enumwaii/enforce-enum-casing': ['error', { ignore }],
    'enumwaii/no-object-em': ['error', { ignore }],
  };
};

/**
 * Helper function to create ignore patterns for workspace packages
 * Used for import resolution rules to prevent false positives
 * 
 * @param {string} workspaceName - The name of the workspace package
 * @returns {string} Regex pattern for the workspace
 */
const createWorkspaceIgnorePattern = (workspaceName) => {
  // Escape special regex characters in workspace name
  const escaped = workspaceName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Match: workspace-name OR @workspace-name (with optional subpaths)
  return `^@?${escaped}(/.*)?$`;
};

const SHARED_RESTRICTED_SYNTAX = [
  {
    selector:
      'TSVoidKeyword:not(TSInterfaceDeclaration TSVoidKeyword, TSAbstractMethodDefinition TSVoidKeyword, TSAbstractPropertyDefinition TSVoidKeyword, TSTypeAliasDeclaration TSVoidKeyword, TSDeclareFunction TSVoidKeyword, TSMethodSignature TSVoidKeyword, MethodDefinition:not([value.body]) TSVoidKeyword)',
    message:
      'Using explicit `void` or `Promise<void>` is not encouraged. Please either do not specify a return type or specify the type.',
  },
  {
    selector: 'TSEnumDeclaration',
    message: 'Avoid TypeScript enum. Declare the closed set with Enumwaii and use its exported accessor and schema.',
  },
];

/**
 * Common base configuration shared across all project types
 */
const getBaseConfig = (options) => {
  const { tsconfigRootDir, gitignorePath, enumwaiiWireExceptions = [] } = options;

  const jsConfig = [
    // ESLint Recommended Rules
    {
      name: 'js/config',
      ...js.configs.recommended,
    },
    // Stylistic Plugin
    plugins.stylistic,
    // Import X Plugin
    plugins.importX,
    // Airbnb Base Recommended Config
    ...configs.base.recommended,
    // Strict Import Config
    rules.base.importsStrict,
  ];

  const typescriptConfig = [
    // TypeScript ESLint Plugin
    plugins.typescriptEslint,
    // Airbnb Base TypeScript Config
    ...configs.base.typescript,
    // Strict TypeScript Config
    rules.typescript.typescriptEslintStrict,
  ];

  const prettierConfig = [
    // Prettier Plugin
    {
      name: 'prettier/plugin/config',
      plugins: {
        prettier: prettierPlugin,
      },
    },
    // Prettier Config
    {
      name: 'prettier/config',
      rules: {
        ...prettierConfigRules,
        'prettier/prettier': [
          'warn',
          {
            endOfLine: 'auto',
          },
        ],
      },
    },
  ];

  const modelFileOverrides = {
    files: ['**/*.model.ts'],
    rules: {
      'max-classes-per-file': 'off',
    },
  };

  const sharedRules = {
    plugins: {
      enumwaii: enumwaiiPlugin,
    },
    rules: {
      ...createEnumwaiiRules(enumwaiiWireExceptions),
      'import-x/prefer-default-export': 'off',
      'no-console': 'off',
      'no-continue': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      'no-await-in-loop': 'off',
      'import-x/no-unresolved': [
        'error',
        {
          ignore: [
            '^#~/',
            // Builtins newer than the resolver's list.
            '^node:sqlite$',
            // Workspace packages (prevent false positives)
            createWorkspaceIgnorePattern('startername'),
            createWorkspaceIgnorePattern('shared'),
          ],
        },
      ],
      'import-x/no-extraneous-dependencies': [
        'error',
        {
          devDependencies: true,
          optionalDependencies: false,
          peerDependencies: false,
          packageDir: ['./', '../..'],
        },
      ],
      // prettier plugin is responsible for formatting issues
      'import-x/order': 'off',
      // Unlimited depth is the default in both import-x and oxlint; airbnb's "∞" string is not valid oxlint config
      'import-x/no-cycle': 'error',
      'no-restricted-syntax': ['error', ...SHARED_RESTRICTED_SYNTAX],
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-floating-promises': ['error', { ignoreVoid: true }],
      'no-void': ['error', { allowAsStatement: true }],
      'import-x/no-named-as-default': 'off',
      'class-methods-use-this': 'off',
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'interface',
          format: ['PascalCase'],
          prefix: ['i'],
        },
        {
          selector: 'variable',
          types: ['boolean'],
          format: ['PascalCase', 'camelCase', 'UPPER_CASE'],
          prefix: ['is', 'should', 'has', 'can', 'did', 'will', 'have', 'might', 'does'],
          // Radix-style `asChild` props keep the name their primitives expect.
          filter: {
            regex: '^asChild$',
            match: false,
          },
        },
        {
          selector: 'variable',
          types: ['boolean'],
          modifiers: ['const'],
          format: null,
          custom: {
            regex:
              '^(is|should|has|can|did|will|have|might|was|does)[A-Z][a-zA-Z]*$|^(IS|SHOULD|HAS|CAN|DID|WILL|HAVE|MIGHT|WAS|DOES)_[A-Z_]+$',
            match: true,
          },
          filter: {
            regex: '^asChild$',
            match: false,
          },
        },
      ],
      '@typescript-eslint/only-throw-error': 'off',
      'import-x/no-anonymous-default-export': 'off',
      '@typescript-eslint/array-type': 'off',
      'no-underscore-dangle': [
        'error',
        {
          allow: ['__dirname', '__filename', '_id', '_doc', '_meta', 'id_', '__typename'],
        },
      ],
      'prettier/prettier': 'off',
    },
  };

  const noIndexFilesConfig = {
    name: 'no-index-files',
    files: ['**/index.ts', '**/index.tsx'],
    // File-based routes name a folder's own route `index`.
    ignores: ['**/routes/**/index.ts', '**/routes/**/index.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...SHARED_RESTRICTED_SYNTAX,
        {
          selector: 'Program',
          message: 'index.ts/tsx files are forbidden. Use explicit file names for all exports and imports.',
        },
      ],
    },
  };

  return {
    baseIgnores: [
      {
        ignores: [
          'node_modules/**',
          '*.config.{js,mjs,cjs,ts}',
          '**/*.config.{js,mjs,cjs,ts}',
          'test/**',
          'tests/**',
          'dist/**',
          'build/**',
          '.lintstagedrc.{js,cjs,mjs}',
          // Connection points, rewritten by create-tsukuri on every add/remove.
          'src/generated/**',
        ],
      },
      ...(gitignorePath ? [includeIgnoreFile(gitignorePath)] : []),
    ],
    jsConfig,
    typescriptConfig,
    prettierConfig,
    sharedRules,
    modelFileOverrides,
    noIndexFilesConfig,
    typescriptSettings: [
      {
        name: 'typescript/parser-options',
        languageOptions: {
          parserOptions: {
            projectService: true,
            tsconfigRootDir,
          },
        },
      },
      {
        name: 'typescript/import-resolver',
        settings: {
          // Resolutions expire after 30 s by default, shorter than a full lint; one lint run outlives no file move.
          'import-x/cache': { lifetime: Number.POSITIVE_INFINITY },
          'import-x/resolver-next': [
            createTypeScriptImportResolver({
              alwaysTryTypes: true,
              bun: true,
            }),
          ],
        },
      },
    ],
  };
};

/**
 * Complete backend/Node.js rule set, before oxlint takes over the rules it runs
 *
 * @param {Object} options - Configuration options
 * @param {string} options.rootDir - Root directory of the project (typically import.meta.url)
 * @param {string[]} [options.additionalIgnores] - Additional patterns to ignore
 * @param {string[]} [options.defaultExportFiles] - Files a tool loads through their default export
 * @param {Object[]} [options.enumwaiiWireExceptions] - Enumwaii declarations whose values an external system spells
 * @returns {Array} ESLint flat config array
 */
const buildBackendConfig = (options = {}) => {
  const { rootDir, additionalIgnores = [], defaultExportFiles, enumwaiiWireExceptions } = options;
  
  const currentFilename = fileURLToPath(rootDir);
  const currentDirname = path.dirname(currentFilename);
  const tsconfigRootDir = path.resolve(currentDirname);
  const gitignorePath = path.resolve(currentDirname, '.gitignore');

  const base = getBaseConfig({ tsconfigRootDir, gitignorePath, enumwaiiWireExceptions });

  const nodeConfig = [
    // Node Plugin
    plugins.node,
    // Airbnb Node Recommended Config
    ...configs.node.recommended,
  ];

  const nodeSpecificRules = {
    rules: {
      // node:sqlite is a release candidate in Node 26 and ships without a flag.
      'n/no-unsupported-features/node-builtins': ['error', { version: '>=26.0.0', ignores: ['sqlite'] }],
    },
  };

  return [
    ...base.baseIgnores,
    ...(additionalIgnores.length > 0 ? [{ ignores: additionalIgnores }] : []),
    ...base.jsConfig,
    ...nodeConfig,
    ...base.typescriptConfig,
    ...base.typescriptSettings,
    ...base.prettierConfig,
    base.sharedRules,
    base.modelFileOverrides,
    base.noIndexFilesConfig,
    nodeSpecificRules,
    ...createConventionRulesConfig({ doesRenderReact: false, defaultExportFiles }),
  ];
};

/**
 * ESLint configuration for backend/Node.js projects, without the rules oxlint runs
 *
 * @param {Parameters<typeof buildBackendConfig>[0]} options
 * @returns {Promise<Array>} ESLint flat config array
 */
export const createBackendConfig = (options) => withoutOxlintRules(buildBackendConfig(options));

/**
 * Oxlint configuration for backend/Node.js projects
 *
 * @param {Parameters<typeof buildBackendConfig>[0]} options
 * @returns {Promise<Object>} Oxlint config
 */
export const createBackendOxlintConfig = (options) => createOxlintConfigFromEslintConfig(buildBackendConfig(options));

const importPlugin = async (pluginName) => {
  try {
    const plugin = await import(pluginName);
    return plugin.default;
  } catch (e) {
    console.warn(`${pluginName} not installed, skipping related rules`);
    return null;
  }

};

/**
 * Complete web/React rule set, before oxlint takes over the rules it runs
 *
 * @param {Object} options - Configuration options
 * @param {string} options.rootDir - Root directory of the project (typically import.meta.url)
 * @param {string} [options.tailwindConfigPath] - Path to Tailwind CSS config
 * @param {string[]} [options.additionalIgnores] - Additional patterns to ignore
 * @param {string[]} [options.defaultExportFiles] - Files a tool loads through their default export
 * @param {Object[]} [options.enumwaiiWireExceptions] - Enumwaii declarations whose values an external system spells
 * @returns {Promise<Array>} ESLint flat config array
 */
const buildWebConfig = async (options = {}) => {
  const { rootDir, tailwindConfigPath, additionalIgnores = [], defaultExportFiles, enumwaiiWireExceptions } = options;
  
  const currentFilename = fileURLToPath(rootDir);
  const currentDirname = path.dirname(currentFilename);
  const tsconfigRootDir = path.resolve(currentDirname);
  const gitignorePath = path.resolve(currentDirname, '.gitignore');

  const base = getBaseConfig({ tsconfigRootDir, gitignorePath, enumwaiiWireExceptions });

  // Dynamic imports for web-specific plugins
  const tailwindcssPlugin = await importPlugin('eslint-plugin-better-tailwindcss');
  const pluginRouter = await importPlugin('@tanstack/eslint-plugin-router');
  const queryPlugin = await importPlugin('@tanstack/eslint-plugin-query');
  const reactRefreshPlugin = await importPlugin('eslint-plugin-react-refresh');

  const reactConfig = [
    // React Plugin
    plugins.react,
    // React Hooks Plugin
    plugins.reactHooks,
    // React JSX A11y Plugin
    plugins.reactA11y,
    // Airbnb React Recommended Config
    ...configs.react.recommended,
    // Strict React Config
    rules.react.strict,
    // Airbnb React TypeScript Config
    ...configs.react.typescript,
    {
      files: ['**/*.{jsx,tsx}'],
      languageOptions: {
        parserOptions: {
          ecmaFeatures: {
            jsx: true,
          },
        },
      },
      plugins: {
        ...(tailwindcssPlugin && { 'better-tailwindcss': tailwindcssPlugin }),
        ...(reactRefreshPlugin && { 'react-refresh': reactRefreshPlugin }),
      },
      rules: {
        ...(tailwindcssPlugin && {
          ...tailwindcssPlugin.configs['stylistic-error'].rules,
          ...tailwindcssPlugin.configs['correctness-error'].rules,
          'better-tailwindcss/enforce-consistent-line-wrapping': 'off',
          'better-tailwindcss/no-unregistered-classes': 'off',
        }),
        ...(reactRefreshPlugin && {
          'react-refresh/only-export-components': 'error',
        }),
      },
    },
    ...(reactRefreshPlugin ? [
      {
        // disable for route files since they often export non-component values (like route metadata)
        files: ['src/routes/**/*.{jsx,tsx}', 'variants/*/src/routes/**/*.{jsx,tsx}'],
        rules: {
          'react-refresh/only-export-components': 'off',
        },
      }
    ] : []),
    ...(pluginRouter ? pluginRouter.configs['flat/recommended'] : []),
    ...(queryPlugin ? queryPlugin.configs['flat/recommended'] : []),
  ];

  const webSpecificRules = {
    rules: {
      'react/function-component-definition': 'off',
      'react/react-in-jsx-scope': 'off',
      'react/jsx-sort-props': 'off',
      'react/jsx-fragments': 'off',
      'react/require-default-props': 'off',
      'no-param-reassign': [
        'error',
        {
          ignorePropertyModificationsFor: ['prev'],
          ignorePropertyModificationsForRegex: ['^prev', '^draft'],
        }
      ],
      'better-tailwindcss/no-unknown-classes': 'off',
      '@typescript-eslint/no-use-before-define': [
        'error',
        {
          functions: false,
        },
      ],
      'jsx-a11y/label-has-associated-control': [
        'error',
        {
          labelComponents: ['Label'],
          labelAttributes: ['htmlFor'],
          controlComponents: ['Input', 'input', 'Textarea', 'textarea'],
          assert: 'either',
          depth: 3,
        },
      ],
    },
  };

  const tailwindSettings = tailwindConfigPath
    ? [
        {
          settings: {
            'better-tailwindcss': {
              entryPoint: tailwindConfigPath,
            },
          },
        },
      ]
    : [];

  return [
    ...base.baseIgnores,
    ...(additionalIgnores.length > 0 ? [{ ignores: additionalIgnores }] : []),
    ...tailwindSettings,
    ...base.jsConfig,
    ...reactConfig,
    ...base.typescriptConfig,
    ...base.typescriptSettings,
    ...base.prettierConfig,
    base.sharedRules,
    base.modelFileOverrides,
    base.noIndexFilesConfig,
    webSpecificRules,
    ...createConventionRulesConfig({ doesRenderReact: true, defaultExportFiles }),
  ];
};

/**
 * ESLint configuration for web/React projects, without the rules oxlint runs
 *
 * @param {Parameters<typeof buildWebConfig>[0]} options
 * @returns {Promise<Array>} ESLint flat config array
 */
export const createWebConfig = async (options) => withoutOxlintRules(await buildWebConfig(options));

/**
 * Oxlint configuration for web/React projects
 *
 * @param {Parameters<typeof buildWebConfig>[0]} options
 * @returns {Promise<Object>} Oxlint config
 */
export const createWebOxlintConfig = async (options) =>
  createOxlintConfigFromEslintConfig(await buildWebConfig(options));
