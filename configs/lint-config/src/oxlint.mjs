/**
 * Oxlint runs every rule it implements natively, translated 1:1 from the ESLint
 * config by `@oxlint/migrate`. ESLint keeps only the rules oxlint cannot run
 * (custom plugins, naming conventions, a few import and node rules).
 */
import migrateEslintConfigToOxlint from '@oxlint/migrate';
import oxlintPlugin from 'eslint-plugin-oxlint';

const OXLINT_MIGRATION_OPTIONS = {
  typeAware: true,
  jsPlugins: false,
};

/**
 * Oxlint rules whose port catches differently from the ESLint original, so
 * ESLint keeps them.
 */
const RULES_KEPT_IN_ESLINT = [
  // Unaware of `emitDecoratorMetadata`: it would turn tsyringe constructor-injected classes into type imports.
  'typescript/consistent-type-imports',
  // `ignoreCase: true` has no oxlint equivalent, so oxlint would miss props that differ only in case.
  'react/jsx-no-duplicate-props',
  // Flags assertions that steer generic inference (TanStack Form `withFieldGroup` defaults and props) as unnecessary.
  'typescript/no-unnecessary-type-assertion',
];

/** Rules only oxlint runs, on top of the ones translated from ESLint. */
const ADDITIONAL_OXLINT_RULES = {
  'typescript/no-deprecated': 'error',
  'typescript/no-base-to-string': 'error',
  'eslint/preserve-caught-error': 'error',
  'eslint/no-unmodified-loop-condition': 'error',
  'unicorn/no-array-sort': 'error',
  'unicorn/no-array-reverse': 'error',
};

const ADDITIONAL_OXLINT_PLUGINS = ['eslint', 'typescript', 'unicorn'];

/** Rules whose ESLint options only restate the default; oxlint accepts no options for them. */
const RULES_WITH_DEFAULT_OPTIONS_ONLY = ['react/jsx-no-undef', 'react/no-children-prop', 'react/no-danger'];

const toOxlintRuleEntry = (ruleName, ruleEntry) =>
  RULES_WITH_DEFAULT_OPTIONS_ONLY.includes(ruleName) && Array.isArray(ruleEntry) ? ruleEntry[0] : ruleEntry;

const toOxlintRules = (rules = {}) =>
  Object.fromEntries(
    Object.entries(rules)
      .filter(([ruleName]) => !RULES_KEPT_IN_ESLINT.includes(ruleName))
      .map(([ruleName, ruleEntry]) => [ruleName, toOxlintRuleEntry(ruleName, ruleEntry)]),
  );

/**
 * @param {Array} eslintConfig - Complete ESLint flat config of one workspace
 * @returns {Promise<Object>} Oxlint config with the rules oxlint can run
 */
export const createOxlintConfigFromEslintConfig = async (eslintConfig) => {
  const oxlintConfig = await migrateEslintConfigToOxlint(eslintConfig, undefined, OXLINT_MIGRATION_OPTIONS);

  return {
    ...oxlintConfig,
    plugins: [...new Set([...(oxlintConfig.plugins ?? []), ...ADDITIONAL_OXLINT_PLUGINS])],
    rules: toOxlintRules(oxlintConfig.rules),
    overrides: [
      ...(oxlintConfig.overrides ?? []).map((override) => ({ ...override, rules: toOxlintRules(override.rules) })),
      // Last, so airbnb's per-extension overrides cannot switch these back off.
      { files: ['**/*'], rules: ADDITIONAL_OXLINT_RULES },
    ],
  };
};

const OXLINT_IMPORT_RULE_PREFIX = 'import/';
const ESLINT_IMPORT_RULE_PREFIX = 'import-x/';

/**
 * eslint-plugin-oxlint turns off `import/*` names, while airbnb-extended registers the same rules as `import-x/*`.
 */
const toImportXRuleNames = (rules = {}) =>
  Object.fromEntries(
    Object.entries(rules)
      .filter(([ruleName]) => ruleName.startsWith(OXLINT_IMPORT_RULE_PREFIX))
      .map(([ruleName, ruleEntry]) => [
        `${ESLINT_IMPORT_RULE_PREFIX}${ruleName.slice(OXLINT_IMPORT_RULE_PREFIX.length)}`,
        ruleEntry,
      ]),
  );

/**
 * @param {Array} eslintConfig - Complete ESLint flat config of one workspace
 * @returns {Promise<Array>} The same config with every rule oxlint runs turned off
 */
export const withoutOxlintRules = async (eslintConfig) => {
  const oxlintConfig = await createOxlintConfigFromEslintConfig(eslintConfig);
  const rulesHandedToOxlint = oxlintPlugin.buildFromOxlintConfig(oxlintConfig, { typeAware: true });

  return [
    ...eslintConfig,
    ...rulesHandedToOxlint,
    ...rulesHandedToOxlint.map((config) => ({
      ...config,
      name: `${config.name}/import-x`,
      rules: toImportXRuleNames(config.rules),
    })),
    {
      name: 'oxlint/shared-disable-directives',
      // Both linters read the same eslint-disable comments, so each one sees the other's directives as unused,
      // and `eslint --fix` would delete directives that oxlint still needs.
      linterOptions: { reportUnusedDisableDirectives: 'off' },
    },
  ];
};
