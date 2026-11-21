import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import { z } from 'zod';

import { DEPENDENCY_FIELDS } from '#~/engine/merge/package-json-merger';

import { REPOSITORY_ROOT } from './temp-dir';

const dependencyRecordSchema = z.record(z.string(), z.string());

const repositoryPackageJsonSchema = z.object({
  dependencies: dependencyRecordSchema.default({}),
  devDependencies: dependencyRecordSchema.default({}),
  peerDependencies: dependencyRecordSchema.default({}),
});

const repositoryWorkspaceSchema = z.object({ catalog: dependencyRecordSchema });

export function readRepositoryPackageJson(workspace: string) {
  const packageJsonPath = path.join(REPOSITORY_ROOT, workspace, 'package.json');
  if (!existsSync(packageJsonPath)) return undefined;
  return repositoryPackageJsonSchema.parse(JSON.parse(readFileSync(packageJsonPath, 'utf8')));
}

export function readRepositoryCatalog() {
  return repositoryWorkspaceSchema.parse(parse(readFileSync(path.join(REPOSITORY_ROOT, 'pnpm-workspace.yaml'), 'utf8')))
    .catalog;
}

export function listDependencies(dependencyFields: Record<(typeof DEPENDENCY_FIELDS)[number], Record<string, string>>) {
  return DEPENDENCY_FIELDS.flatMap((field) =>
    Object.entries(dependencyFields[field]).map(([name, version]) => ({ field, name, version })),
  );
}
