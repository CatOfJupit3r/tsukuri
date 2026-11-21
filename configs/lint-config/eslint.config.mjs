const STATIC_IMPORT_MESSAGE =
  "lint-config sources load packages only through static import/export-from declarations or importPlugin with a string literal, so the dependency test sees every package.";

const ALLOWED_IMPORT_META_PROPERTIES = ["url", "dirname", "filename"];
const ALLOWED_IMPORT_META_PROPERTIES_PATTERN =
  ALLOWED_IMPORT_META_PROPERTIES.join("|");

const PACKAGE_LOADING_SELECTORS = [
  "ImportExpression",
  "TSImportEqualsDeclaration",
  // A bare require / createRequire identifier (import specifiers, calls, aliases, arguments), but not an object key or a
  // non-call property name such as { require: value } or object.require.
  "Identifier[name=/^(require|createRequire)$/]:not(MemberExpression[computed=false] > Identifier.property):not(Property[computed=false] > Identifier.key)",
  // The same names reached through a member: module.require(...), namespace.createRequire, and destructuring them.
  "CallExpression > MemberExpression.callee > Identifier.property[name=/^(require|createRequire)$/]",
  "MemberExpression > Identifier.property[name='createRequire']",
  "ObjectPattern > Property[computed=false] > Identifier.key[name=/^(require|createRequire)$/]",
  "MemberExpression[computed=true] > Literal.property[value=/^(require|createRequire)$/]",
  "Property[computed=true] > Literal.key[value=/^(require|createRequire)$/]",
  // Anything on import.meta except the file location properties, and any destructuring of import.meta.
  `MemberExpression[object.type='MetaProperty'][computed=false][property.name!=/^(${ALLOWED_IMPORT_META_PROPERTIES_PATTERN})$/]`,
  `MemberExpression[object.type='MetaProperty'][computed=true][property.value!=/^(${ALLOWED_IMPORT_META_PROPERTIES_PATTERN})$/]`,
  "MemberExpression[object.type='MetaProperty'][computed=true][property.type!='Literal']",
  "VariableDeclarator[id.type='ObjectPattern'][init.type='MetaProperty']",
  "AssignmentExpression[left.type='ObjectPattern'][right.type='MetaProperty']",
  // importPlugin takes a string literal so the dependency test can read the package name.
  "CallExpression[callee.name='importPlugin'][arguments.0.type!='Literal']",
];

export default [
  {
    files: ["src/**/*.{mjs,js,cjs,ts,mts,cts,jsx,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        ...PACKAGE_LOADING_SELECTORS.map((selector) => ({
          selector,
          message: STATIC_IMPORT_MESSAGE,
        })),
      ],
    },
  },
];
