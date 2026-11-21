import ts from 'typescript';

import { PACKAGE_LOADING_FUNCTION_NAME } from './lint-config-dependencies.constants';

function readStringLiteralText(node: ts.Node | undefined) {
  return node !== undefined && ts.isStringLiteralLike(node) ? node.text : undefined;
}

function isPackageLoadingCall(node: ts.CallExpression) {
  return ts.isIdentifier(node.expression) && node.expression.text === PACKAGE_LOADING_FUNCTION_NAME;
}

function readNodeSpecifier(node: ts.Node) {
  if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
    return readStringLiteralText(node.moduleSpecifier);
  }
  if (ts.isCallExpression(node) && isPackageLoadingCall(node)) {
    return readStringLiteralText(node.arguments[0]);
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
