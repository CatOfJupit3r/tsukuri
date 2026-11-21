/**
 * Reports an inline object type (`{ a: string }`) written in a function parameter or return annotation, at any depth
 * inside generics, unions, intersections, arrays, tuples, predicates, conditional and indexed access types. Declare an
 * `i`-prefixed interface instead.
 *
 * The walk goes from each literal up to the nearest signature annotation and stops at anything else, so a literal inside
 * another object type, a mapped type or a property annotation is not reported twice, and a literal inside a nested
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

/** Type nodes an inline object type can sit inside of on its way up to a signature annotation. */
const WRAPPER_NODE_TYPES = new Set([
  'TSTypeReference',
  'TSTypeParameterInstantiation',
  'TSUnionType',
  'TSIntersectionType',
  'TSArrayType',
  'TSTupleType',
  'TSTypeOperator',
  'TSOptionalType',
  'TSRestType',
  'TSNamedTupleMember',
  'TSTypePredicate',
  'TSConditionalType',
  'TSIndexedAccessType',
]);

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
    } else if (!WRAPPER_NODE_TYPES.has(node.type)) {
      return null;
    }
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
