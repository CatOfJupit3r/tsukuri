const STATIC_IMPORT_MESSAGE =
  'lint-config sources load packages only through static import/export-from declarations or the importPlugin helper, so the dependency test sees every package.';

const PACKAGE_LOADING_SELECTORS = [
  'ImportExpression',
  'TSImportEqualsDeclaration',
  "Identifier[name='require']",
  "Identifier[name='createRequire']",
  "MemberExpression[object.type='MetaProperty'][property.name='resolve']",
];

export default [
  {
    files: ['src/**/*.{mjs,js,cjs,ts,mts,cts,jsx,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...PACKAGE_LOADING_SELECTORS.map((selector) => ({ selector, message: STATIC_IMPORT_MESSAGE })),
      ],
    },
  },
];
