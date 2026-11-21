/**
 * `no-restricted-syntax` entries for the small strict conventions: no re-exports, no boolean default values, no bare
 * `void`, no empty `catch`, no TypeScript `enum`, and named types instead of inline object types.
 */
const FUNCTION_NODES =
  ':matches(FunctionDeclaration, FunctionExpression, ArrowFunctionExpression, TSDeclareFunction, TSEmptyBodyFunctionExpression)';
const PARAMETER_NODES = ':matches(Identifier, ObjectPattern, ArrayPattern, RestElement)';
const INLINE_OBJECT_TYPE = '[typeAnnotation.typeAnnotation.type="TSTypeLiteral"]';

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
    selector: [
      `${FUNCTION_NODES} > ${PARAMETER_NODES}${INLINE_OBJECT_TYPE}`,
      `${FUNCTION_NODES} > AssignmentPattern[left.typeAnnotation.typeAnnotation.type="TSTypeLiteral"]`,
      `${FUNCTION_NODES} > TSParameterProperty > ${PARAMETER_NODES}${INLINE_OBJECT_TYPE}`,
      `${FUNCTION_NODES} > TSParameterProperty > AssignmentPattern[left.typeAnnotation.typeAnnotation.type="TSTypeLiteral"]`,
    ].join(', '),
    message: 'Declare the parameter type as a named interface instead of an inline object type.',
  },
  {
    selector: `${FUNCTION_NODES}[returnType.typeAnnotation.type="TSTypeLiteral"]`,
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
