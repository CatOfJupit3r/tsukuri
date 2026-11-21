import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import { z } from 'zod';

import { listDependencyEntries } from '#~/engine/merge/package-json-merger';

import { REPOSITORY_ROOT } from './temp-dir';

const dependencyRecordSchema = z.record(z.string(), z.string());

const repositoryPackageJsonSchema = z.object({
  dependencies: dependencyRecordSchema.default({}),
  devDependencies: dependencyRecordSchema.default({}),
  peerDependencies: dependencyRecordSchema.default({}),
});

const repositoryWorkspaceSchema = z.object({ catalog: dependencyRecordSchema });

/** The workspace package.json exactly as written (scripts and all), or undefined when the workspace has none. */
export function readRepositoryPackageJsonFile(workspace: string): unknown {
  const packageJsonPath = path.join(REPOSITORY_ROOT, workspace, 'package.json');
  if (!existsSync(packageJsonPath)) return undefined;
  return JSON.parse(readFileSync(packageJsonPath, 'utf8'));
}

/** The dependency fields of a workspace package.json, or undefined when the workspace has none. */
export function readRepositoryPackageJson(workspace: string) {
  const packageJson = readRepositoryPackageJsonFile(workspace);
  return packageJson === undefined ? undefined : repositoryPackageJsonSchema.parse(packageJson);
}

export function readRepositoryCatalog() {
  return repositoryWorkspaceSchema.parse(parse(readFileSync(path.join(REPOSITORY_ROOT, 'pnpm-workspace.yaml'), 'utf8')))
    .catalog;
}

/** Every dependency of a workspace package.json; none for a workspace without one. */
export function listRepositoryDependencies(workspace: string) {
  const packageJson = readRepositoryPackageJson(workspace);
  return packageJson === undefined ? [] : listDependencyEntries(packageJson);
}
