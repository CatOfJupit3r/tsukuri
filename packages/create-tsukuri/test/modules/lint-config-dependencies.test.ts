import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

import {
  installedPackageSchema,
  LINT_CONFIG_ROOT,
  LINT_CONFIG_SOURCE_EXTENSIONS,
  LINT_CONFIG_SOURCE_ROOT,
  NON_PACKAGE_SPECIFIER_PATTERN,
  PACKAGE_LOADING_FUNCTION_NAMES,
} from '../helpers/lint-config-dependencies.constants';
import { readRepositoryPackageJson } from '../helpers/repository-files';
import { LINT_CONFIG_WORKSPACE } from '../helpers/repository-sync.constants';

function toPackageName(specifier: string) {
  if (NON_PACKAGE_SPECIFIER_PATTERN.test(specifier)) return undefined;
  const segments = specifier.split('/');
  return specifier.startsWith('@') ? segments.slice(0, 2).join('/') : segments[0];
}

function readImportSpecifiers(sourceFile: ts.SourceFile) {
  const specifiers: string[] = [];
  const visit = (node: ts.Node) => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier !== undefined &&
      ts.isStringLiteralLike(node.moduleSpecifier)
    ) {
      specifiers.push(node.moduleSpecifier.text);
    }
    if (ts.isCallExpression(node)) {
      const [argument] = node.arguments;
      const isPackageLoadingCall =
        node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && PACKAGE_LOADING_FUNCTION_NAMES.includes(node.expression.text));
      if (isPackageLoadingCall && argument !== undefined && ts.isStringLiteralLike(argument)) {
        specifiers.push(argument.text);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return specifiers;
}

function readImportedPackageNames() {
  const sourceFiles = readdirSync(LINT_CONFIG_SOURCE_ROOT, { recursive: true, encoding: 'utf8' }).filter((file) =>
    LINT_CONFIG_SOURCE_EXTENSIONS.includes(path.extname(file)),
  );
  const packageNames = sourceFiles.flatMap((file) => {
    const sourcePath = path.join(LINT_CONFIG_SOURCE_ROOT, file);
    const sourceFile = ts.createSourceFile(sourcePath, readFileSync(sourcePath, 'utf8'), ts.ScriptTarget.Latest);
    return readImportSpecifiers(sourceFile).flatMap((specifier) => toPackageName(specifier) ?? []);
  });
  return new Set(packageNames);
}

function readPeerDependencyNames(dependencyName: string) {
  const installedPackageJson = path.join(LINT_CONFIG_ROOT, 'node_modules', dependencyName, 'package.json');
  if (!existsSync(installedPackageJson)) {
    throw new Error(`${dependencyName} is not installed for ${LINT_CONFIG_WORKSPACE}; run pnpm install first`);
  }
  return Object.keys(
    installedPackageSchema.parse(JSON.parse(readFileSync(installedPackageJson, 'utf8'))).peerDependencies,
  );
}

describe('lint-config dependencies', () => {
  const dependencyNames = Object.keys(readRepositoryPackageJson(LINT_CONFIG_WORKSPACE)?.dependencies ?? {});
  const importedPackageNames = readImportedPackageNames();
  const peerDependencyNames = new Set(dependencyNames.flatMap(readPeerDependencyNames));

  it.each(dependencyNames)('%s is imported by a lint-config source or is a peer of another dependency', (name) => {
    expect(importedPackageNames.has(name) || peerDependencyNames.has(name)).toBe(true);
  });
});
