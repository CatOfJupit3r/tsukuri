import ts from 'typescript';

import { PACKAGE_LOADING_FUNCTION_NAMES } from './lint-config-dependencies.constants';

function isPackageLoadingCall(node: ts.CallExpression) {
  const callee = node.expression;
  if (callee.kind === ts.SyntaxKind.ImportKeyword) return true;
  if (ts.isIdentifier(callee)) return PACKAGE_LOADING_FUNCTION_NAMES.includes(callee.text);
  return (
    ts.isPropertyAccessExpression(callee) && ts.isMetaProperty(callee.expression) && callee.name.text === 'resolve'
  );
}

function readNodeSpecifier(node: ts.Node) {
  if (
    (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
    node.moduleSpecifier !== undefined &&
    ts.isStringLiteralLike(node.moduleSpecifier)
  ) {
    return node.moduleSpecifier.text;
  }
  if (
    ts.isImportEqualsDeclaration(node) &&
    ts.isExternalModuleReference(node.moduleReference) &&
    ts.isStringLiteralLike(node.moduleReference.expression)
  ) {
    return node.moduleReference.expression.text;
  }
  if (ts.isCallExpression(node) && isPackageLoadingCall(node)) {
    const [argument] = node.arguments;
    return argument !== undefined && ts.isStringLiteralLike(argument) ? argument.text : undefined;
  }
  return undefined;
}

export function readImportSpecifiers(sourceFile: ts.SourceFile) {
  const specifiers: string[] = [];
  function visit(node: ts.Node) {
    const specifier = readNodeSpecifier(node);
    if (specifier !== undefined) specifiers.push(specifier);
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return specifiers;
}
