import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

import { readRepositoryPackageJson } from '../helpers/repository-files';
import { REPOSITORY_ROOT } from '../helpers/temp-dir';

const LINT_CONFIG_WORKSPACE = 'configs/lint-config';
const LINT_CONFIG_ROOT = path.join(REPOSITORY_ROOT, LINT_CONFIG_WORKSPACE);
const LINT_CONFIG_SOURCE_ROOT = path.join(LINT_CONFIG_ROOT, 'src');

const IMPORTED_PACKAGE_PATTERN = /(?:from\s*|import\(\s*|importPlugin\(\s*)['"]((?:@[^/'"]+\/)?[^/'"#.@][^/'"]*)/g;

const installedPackageSchema = z.object({ peerDependencies: z.record(z.string(), z.string()).default({}) });

function readImportedPackageNames() {
  const sourceFiles = readdirSync(LINT_CONFIG_SOURCE_ROOT, { recursive: true, encoding: 'utf8' }).filter((file) =>
    file.endsWith('.mjs'),
  );
  const packageNames = sourceFiles.flatMap((file) =>
    [...readFileSync(path.join(LINT_CONFIG_SOURCE_ROOT, file), 'utf8').matchAll(IMPORTED_PACKAGE_PATTERN)].flatMap(
      (match) => match[1] ?? [],
    ),
  );
  return new Set(packageNames);
}

function readPeerDependencyNames(dependencyName: string) {
  const installedPackageJson = path.join(LINT_CONFIG_ROOT, 'node_modules', dependencyName, 'package.json');
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
