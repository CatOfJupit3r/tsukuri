/**
 * Reports an inline object type (`{ a: string }`) written in a function parameter or return annotation, at any depth
 * inside any type wrapper (generics, unions, template literals, import types, type queries, predicates, conditional and
 * indexed access types, ...). Declare an
 * `i`-prefixed interface instead.
 *
 * The walk goes from each literal up to the nearest signature annotation and stops at anything else, so a literal inside
 * another object type or a property annotation is not reported twice, a literal used as the value type of a mapped type
 * is reported while the mapped type itself stays allowed, and a literal inside a nested
 * function type is reported at that inner signature only.
 */
const SIGNATURE_NODE_TYPES = new Set([
  'FunctionDeclaration',
  'FunctionExpression',
  'ArrowFunctionExpression',
  'TSDeclareFunction',
  'TSEmptyBodyFunctionExpression',
  'TSFunctionType',
  'TSConstructorType',
  'TSMethodSignature',
  'TSCallSignatureDeclaration',
  'TSConstructSignatureDeclaration',
]);

const PARAMETER_NODE_TYPES = new Set(['Identifier', 'ObjectPattern', 'ArrayPattern', 'RestElement']);

/**
 * Nodes that end the search. Every other type node (references, unions, template literals, import types, type queries,
 * operators, tuples and any wrapper added later) is walked through, so only this closed set needs maintenance.
 */
const BOUNDARY_NODE_TYPES = new Set([
  'TSTypeLiteral',
  'TSPropertySignature',
  'TSIndexSignature',
  'TSTypeParameter',
  'TSTypeParameterDeclaration',
  'TSTypeAliasDeclaration',
  'TSInterfaceDeclaration',
  'TSInterfaceHeritage',
  'TSClassImplements',
  'TSFunctionType',
  'TSConstructorType',
  'TSAsExpression',
  'TSSatisfiesExpression',
  'TSTypeAssertion',
  'TSNonNullExpression',
  'TSInstantiationExpression',
  'TSParameterProperty',
  'TSEnumDeclaration',
  'TSModuleDeclaration',
]);

/** Nodes whose type arguments are part of a type, as opposed to type arguments of a call or instantiation expression. */
const TYPE_ARGUMENT_OWNER_NODE_TYPES = new Set(['TSTypeReference', 'TSImportType', 'TSTypeQuery']);

/** A mapped type ends the search, except when the walk arrives from its value type (`{ [K in keyof iX]: { a: string } }`). */
const isMappedTypeBoundary = (node, child) => node.type === 'TSMappedType' && node.typeAnnotation !== child;

const isBoundary = (node, child) => {
  if (node.type === 'TSTypeParameterInstantiation') {
    return !TYPE_ARGUMENT_OWNER_NODE_TYPES.has(node.parent.type);
  }
  if (node.type === 'TSMappedType') {
    return isMappedTypeBoundary(node, child);
  }
  return !node.type.startsWith('TS') || BOUNDARY_NODE_TYPES.has(node.type);
};

const ANNOTATION_KIND = { PARAMETER: 'PARAMETER', RETURN: 'RETURN' };

const REPORT_MESSAGE_IDS = {
  [ANNOTATION_KIND.PARAMETER]: 'inlineParameterType',
  [ANNOTATION_KIND.RETURN]: 'inlineReturnType',
};

const findSignatureOfParameter = (parameter) => {
  let owner = parameter.parent;
  if (owner.type === 'AssignmentPattern' && owner.left === parameter) {
    owner = owner.parent;
  }
  if (owner.type === 'TSParameterProperty') {
    owner = owner.parent;
  }
  return SIGNATURE_NODE_TYPES.has(owner.type) ? owner : null;
};

const getSignatureAnnotationKind = (annotation) => {
  const owner = annotation.parent;
  if (SIGNATURE_NODE_TYPES.has(owner.type) && owner.returnType === annotation) {
    return ANNOTATION_KIND.RETURN;
  }
  if (PARAMETER_NODE_TYPES.has(owner.type) && owner.typeAnnotation === annotation && findSignatureOfParameter(owner)) {
    return ANNOTATION_KIND.PARAMETER;
  }
  return null;
};

const findSignatureAnnotationKind = (literal) => {
  let child = literal;
  let node = literal.parent;
  while (node) {
    if (node.type === 'TSTypeAnnotation') {
      const kind = getSignatureAnnotationKind(node);
      if (kind) {
        return kind;
      }
      if (node.parent.type !== 'TSTypePredicate') {
        return null;
      }
    } else if (isBoundary(node, child)) {
      return null;
    }
    child = node;
    node = node.parent;
  }
  return null;
};

export const noInlineSignatureObjectTypeRule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow inline object types in function parameter and return annotations, at any nesting depth.',
    },
    messages: {
      [REPORT_MESSAGE_IDS[ANNOTATION_KIND.PARAMETER]]:
        'Declare the parameter type as a named interface instead of an inline object type.',
      [REPORT_MESSAGE_IDS[ANNOTATION_KIND.RETURN]]:
        'Declare the return type as a named interface instead of an inline object type.',
    },
    schema: [],
  },
  create(context) {
    return {
      TSTypeLiteral(node) {
        const kind = findSignatureAnnotationKind(node);
        if (kind) {
          context.report({ node, messageId: REPORT_MESSAGE_IDS[kind] });
        }
      },
    };
  },
};
