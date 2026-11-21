const STATIC_IMPORT_MESSAGE =
  'lint-config sources load packages only through static import/export-from declarations or importPlugin with a string literal, so the dependency test sees every package.';

const ALLOWED_IMPORT_META_PROPERTIES = ['url', 'dirname', 'filename'];
const ALLOWED_IMPORT_META_PROPERTIES_PATTERN = ALLOWED_IMPORT_META_PROPERTIES.join('|');

const MODULE_LOADING_NAMES = ['require', 'createRequire', 'getBuiltinModule', 'module'];
const MODULE_LOADING_NAMES_PATTERN = MODULE_LOADING_NAMES.join('|');

// A computed key is legal when it is a number, a string literal that is not a module loading name, a variable, or a template
// literal with an expression (array[0], object['key'], config[key], `${NAMESPACE}/rule`). A static template literal is reported.
const LEGAL_COMPUTED_KEY = `:matches([type='Literal'][value=type(number)], [type='Literal'][value=/^(?!(${MODULE_LOADING_NAMES_PATTERN})$)/], Identifier, TemplateLiteral[expressions.length>0])`;

const PACKAGE_LOADING_SELECTORS = [
  'ImportExpression',
  'TSImportEqualsDeclaration',
  // Every import.meta except the object of a plain read of url, dirname or filename.
  `MetaProperty[meta.name='import']:not(MemberExpression[computed=false][property.name=/^(${ALLOWED_IMPORT_META_PROPERTIES_PATTERN})$/] > MetaProperty.object)`,
  // The module loading names as identifiers (import specifiers, calls, aliases, arguments), but not object keys or
  // non-call property names such as { require: value } or object.require.
  `Identifier[name=/^(${MODULE_LOADING_NAMES_PATTERN})$/]:not(MemberExpression[computed=false] > Identifier.property):not(Property[computed=false] > Identifier.key)`,
  // The same names reached through a member or a destructuring pattern.
  'CallExpression > MemberExpression.callee > Identifier.property[name=/^(require|createRequire|getBuiltinModule)$/]',
  'MemberExpression > Identifier.property[name=/^(createRequire|getBuiltinModule)$/]',
  `ObjectPattern > Property[computed=false] > Identifier.key[name=/^(${MODULE_LOADING_NAMES_PATTERN})$/]`,
  `MemberExpression[computed=true] > .property:not(${LEGAL_COMPUTED_KEY})`,
  `Property[computed=true] > .key:not(${LEGAL_COMPUTED_KEY})`,
  // importPlugin is only called directly with a string literal so the dependency test can read the package name.
  "CallExpression[callee.name='importPlugin'][arguments.0.type!='Literal']",
  'Identifier[name=importPlugin]:not(CallExpression > Identifier.callee):not(VariableDeclarator > Identifier.id)',
];

export default [
  {
    files: ['src/**/*.{mjs,js,cjs,ts,mts,cts,jsx,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...PACKAGE_LOADING_SELECTORS.map((selector) => ({
          selector,
          message: STATIC_IMPORT_MESSAGE,
        })),
      ],
    },
  },
];
