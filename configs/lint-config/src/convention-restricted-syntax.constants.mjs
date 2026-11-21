/**
 * `no-restricted-syntax` entries for the small strict conventions: no re-exports, no boolean default values, no bare
 * `void`, no empty `catch`, no TypeScript `enum`, and named types instead of inline object types.
 */
const FUNCTION_NODES =
  ':matches(FunctionDeclaration, FunctionExpression, ArrowFunctionExpression, TSDeclareFunction, TSEmptyBodyFunctionExpression, TSFunctionType, TSConstructorType, TSMethodSignature, TSCallSignatureDeclaration, TSConstructSignatureDeclaration)';
const PARAMETER_NODES = ':matches(Identifier, ObjectPattern, ArrayPattern, RestElement)';
/** Type nodes an inline object type can sit inside of; a nested function type or object type is not listed, so its own signature is reported once, at the inner node. */
const TYPE_WRAPPER_NODES =
  ':matches(TSTypeReference, TSTypeParameterInstantiation, TSUnionType, TSIntersectionType, TSArrayType, TSTupleType, TSTypeOperator, TSOptionalType, TSRestType, TSNamedTupleMember)';
/** Deepest wrapper chain checked, for example `Promise<Array<{ a: string }> | null>` has five wrappers. */
const MAX_TYPE_WRAPPER_DEPTH = 8;
const PARAMETER_ANNOTATION_ROOTS = [
  `${FUNCTION_NODES} > ${PARAMETER_NODES} > TSTypeAnnotation`,
  `${FUNCTION_NODES} > AssignmentPattern > ${PARAMETER_NODES} > TSTypeAnnotation`,
  `${FUNCTION_NODES} > TSParameterProperty > ${PARAMETER_NODES} > TSTypeAnnotation`,
  `${FUNCTION_NODES} > TSParameterProperty > AssignmentPattern > ${PARAMETER_NODES} > TSTypeAnnotation`,
];
const RETURN_ANNOTATION_ROOTS = [`${FUNCTION_NODES} > TSTypeAnnotation`];

const buildInlineObjectTypeSelector = (annotationRoots) =>
  Array.from({ length: MAX_TYPE_WRAPPER_DEPTH + 1 }, (_, depth) =>
    [
      `:matches(${annotationRoots.join(', ')})`,
      ...Array.from({ length: depth }, () => TYPE_WRAPPER_NODES),
      'TSTypeLiteral',
    ].join(' > '),
  ).join(', ');

export const CONVENTION_RESTRICTED_SYNTAX = [
  {
    selector: 'ExportAllDeclaration, ExportNamedDeclaration[source]',
    message: 'Do not re-export from another module. Import the value from where it is defined.',
  },
  {
    selector: 'AssignmentPattern[right.type="Literal"]:matches([right.raw="false"], [right.raw="true"])',
    message:
      'Do not give a boolean a default value. Name it so that `undefined` is the safe, most restrictive case, and invert a negative name.',
  },
  {
    selector:
      'ExpressionStatement > UnaryExpression[operator="void"]:not([argument.callee.property.name="catch"], [argument.expression.callee.property.name="catch"], [argument.callee.property.name="then"][argument.arguments.length=2])',
    message: 'A detached promise needs a rejection handler: `void promise.catch(handler)`.',
  },
  {
    selector: buildInlineObjectTypeSelector(PARAMETER_ANNOTATION_ROOTS),
    message: 'Declare the parameter type as a named interface instead of an inline object type.',
  },
  {
    selector: buildInlineObjectTypeSelector(RETURN_ANNOTATION_ROOTS),
    message: 'Declare the return type as a named interface instead of an inline object type.',
  },
  {
    selector: 'TSTypeAliasDeclaration > TSIntersectionType > TSTypeLiteral',
    message: 'Declare an interface that extends the other types instead of a type alias of an object intersection.',
  },
  {
    selector: 'CatchClause > BlockStatement[body.length=0]',
    message:
      'An empty catch block swallows the error. Handle it, rethrow it, or log it with what failed; a comment alone is not handling.',
  },
  {
    selector: 'TSEnumDeclaration',
    message: 'Avoid TypeScript enum. Declare the closed set with Enumwaii and use its exported accessor and schema.',
  },
];
