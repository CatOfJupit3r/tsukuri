import ts from 'typescript';

import { PACKAGE_LOADING_FUNCTION_NAMES, REQUIRE_FACTORY_FUNCTION_NAME } from './lint-config-dependencies.constants';

function isRequireFactoryCall(node: ts.Node) {
  return (
    ts.isCallExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === REQUIRE_FACTORY_FUNCTION_NAME
  );
}

function isRequireFactoryResult(node: ts.Expression, requireAliasNames: ReadonlySet<string>) {
  return isRequireFactoryCall(node) || (ts.isIdentifier(node) && requireAliasNames.has(node.text));
}

function readRequireAliasNames(sourceFile: ts.SourceFile) {
  const requireAliasNames = new Set<string>();
  function visit(node: ts.Node) {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer !== undefined &&
      isRequireFactoryCall(node.initializer)
    ) {
      requireAliasNames.add(node.name.text);
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return requireAliasNames;
}

function isResolveOfPackageLoader(callee: ts.PropertyAccessExpression, requireAliasNames: ReadonlySet<string>) {
  if (callee.name.text !== 'resolve') return false;
  const target = callee.expression;
  if (ts.isMetaProperty(target)) return true;
  if (ts.isIdentifier(target) && PACKAGE_LOADING_FUNCTION_NAMES.includes(target.text)) return true;
  return isRequireFactoryResult(target, requireAliasNames);
}

function isPackageLoadingCall(node: ts.CallExpression, requireAliasNames: ReadonlySet<string>) {
  const callee = node.expression;
  if (callee.kind === ts.SyntaxKind.ImportKeyword) return true;
  if (ts.isIdentifier(callee)) {
    return PACKAGE_LOADING_FUNCTION_NAMES.includes(callee.text) || requireAliasNames.has(callee.text);
  }
  if (isRequireFactoryCall(callee)) return true;
  return ts.isPropertyAccessExpression(callee) && isResolveOfPackageLoader(callee, requireAliasNames);
}

function readStringLiteralText(node: ts.Node | undefined) {
  return node !== undefined && ts.isStringLiteralLike(node) ? node.text : undefined;
}

function readNodeSpecifier(node: ts.Node, requireAliasNames: ReadonlySet<string>) {
  if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
    return readStringLiteralText(node.moduleSpecifier);
  }
  if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) {
    return readStringLiteralText(node.moduleReference.expression);
  }
  if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) {
    return readStringLiteralText(node.argument.literal);
  }
  if (ts.isCallExpression(node) && isPackageLoadingCall(node, requireAliasNames)) {
    return readStringLiteralText(node.arguments[0]);
  }
  return undefined;
}

export function readImportSpecifiers(sourceFile: ts.SourceFile) {
  const requireAliasNames = readRequireAliasNames(sourceFile);
  const specifiers: string[] = [];
  function visit(node: ts.Node) {
    const specifier = readNodeSpecifier(node, requireAliasNames);
    if (specifier !== undefined) specifiers.push(specifier);
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return specifiers;
}
