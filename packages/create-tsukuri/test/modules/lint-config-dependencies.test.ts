import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

import {
  installedPackageSchema,
  LINT_CONFIG_ROOT,
  LINT_CONFIG_SOURCE_EXTENSIONS,
  LINT_CONFIG_SOURCE_ROOT,
  NON_PACKAGE_SPECIFIER_PATTERN,
} from '../helpers/lint-config-dependencies.constants';
import { readImportSpecifiers } from '../helpers/lint-config-import-scanner';
import { readRepositoryPackageJson } from '../helpers/repository-files';
import { LINT_CONFIG_WORKSPACE } from '../helpers/repository-sync.constants';

function toPackageName(specifier: string) {
  if (NON_PACKAGE_SPECIFIER_PATTERN.test(specifier)) return undefined;
  const segments = specifier.split('/');
  return specifier.startsWith('@') ? segments.slice(0, 2).join('/') : segments[0];
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

describe('lint-config import scanner', () => {
  it.each([
    ['static import', "import x from 'pkg-a';"],
    ['side-effect import', "import 'pkg-a';"],
    ['export from', "export { x } from 'pkg-a';"],
    ['dynamic import', "await import('pkg-a');"],
    ['importPlugin call', "await importPlugin('pkg-a');"],
    ['require call', "const x = require('pkg-a');"],
    ['import equals require', "import x = require('pkg-a');"],
    ['import.meta.resolve', "import.meta.resolve('pkg-a');"],
  ])('finds the package named by a %s', (_form, source) => {
    const sourceFile = ts.createSourceFile('source.ts', source, ts.ScriptTarget.Latest);

    expect(readImportSpecifiers(sourceFile)).toEqual(['pkg-a']);
  });
});
