/**
 * Reports `'key' in value` expressions. Narrow unions with an Enumwaii
 * discriminant instead. When no discriminant can exist (for example, an
 * untyped third-party object), disable the rule for that line and state why:
 *
 *   // eslint-disable-next-line startername/no-in-narrowing -- <reason>
 */
export const noInNarrowingRule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow `in` operator narrowing; use an Enumwaii discriminant.',
    },
    messages: {
      inNarrowing:
        "Avoid `'key' in value` narrowing. Add an Enumwaii discriminant and narrow with switch or equality. If no discriminant can exist, use `// eslint-disable-next-line startername/no-in-narrowing -- <reason>`.",
    },
    schema: [],
  },
  create(context) {
    return {
      'BinaryExpression[operator="in"]'(node) {
        context.report({ node, messageId: 'inNarrowing' });
      },
    };
  },
};
