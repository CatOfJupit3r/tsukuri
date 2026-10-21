import { isDeepStrictEqual } from 'node:util';
import { injectable } from 'tsyringe';

import { GENERATOR_ERROR_CODES } from '#~/enums/generator-error-codes.enums';
import type { ModuleId } from '#~/enums/module-ids.enums';
import type { iPackageJsonContribution } from '#~/manifest/module-manifest.schema';

import { GeneratorError } from '../generator-error';

export interface iOwnedContribution<T> {
  moduleId: ModuleId;
  contribution: T;
}

export type iPackageJson = Record<string, unknown>;

export const DEPENDENCY_FIELDS = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
] as const satisfies readonly (keyof iPackageJsonContribution)[];

/** Conventional package.json key order; unknown keys follow alphabetically. */
const KEY_ORDER = [
  'name',
  'version',
  'private',
  'description',
  'type',
  'imports',
  'main',
  'module',
  'types',
  'bin',
  'exports',
  'files',
  'scripts',
  'engines',
  'packageManager',
  'prettier',
  'config',
  'dependencies',
  'devDependencies',
  'peerDependencies',
];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** `incoming` items not already in `current`, appended in order. */
function unionArrays(current: unknown[], incoming: unknown[]) {
  const merged = [...current];
  for (const item of incoming) {
    if (!merged.some((existing) => isDeepStrictEqual(existing, item))) merged.push(item);
  }
  return merged;
}

function sortKeys<T>(record: Record<string, T>) {
  return Object.fromEntries(Object.entries(record).toSorted(([left], [right]) => left.localeCompare(right)));
}

@injectable()
export class PackageJsonMerger {
  /** Merges every contribution into one package.json per workspace, keyed by workspace directory. */
  public merge(contributions: iOwnedContribution<iPackageJsonContribution>[]) {
    const byWorkspace = new Map<string, iOwnedContribution<iPackageJsonContribution>[]>();
    for (const owned of contributions) {
      const { workspace } = owned.contribution;
      byWorkspace.set(workspace, [...(byWorkspace.get(workspace) ?? []), owned]);
    }

    const result = new Map<string, iPackageJson>();
    for (const [workspace, owned] of byWorkspace) {
      result.set(workspace, this.mergeWorkspace(workspace, owned));
    }
    return result;
  }

  public serialize(packageJson: iPackageJson) {
    const ordered: iPackageJson = {};
    const keys = Object.keys(packageJson).toSorted((left, right) => {
      const leftIndex = KEY_ORDER.indexOf(left);
      const rightIndex = KEY_ORDER.indexOf(right);
      if (leftIndex !== -1 && rightIndex !== -1) return leftIndex - rightIndex;
      if (leftIndex !== -1) return -1;
      if (rightIndex !== -1) return 1;
      return left.localeCompare(right);
    });
    for (const key of keys) ordered[key] = packageJson[key];
    return `${JSON.stringify(ordered, null, 2)}\n`;
  }

  private mergeWorkspace(workspace: string, owned: iOwnedContribution<iPackageJsonContribution>[]) {
    let fields: Record<string, unknown> = {};
    const fieldOwners = new Map<string, ModuleId>();
    const scripts = new Map<string, { value: string; moduleId: ModuleId }>();
    const dependencies = Object.fromEntries(
      DEPENDENCY_FIELDS.map((field) => [field, new Map<string, { value: string; moduleId: ModuleId }>()]),
    ) as Record<(typeof DEPENDENCY_FIELDS)[number], Map<string, { value: string; moduleId: ModuleId }>>;

    for (const { moduleId, contribution } of owned) {
      fields = this.mergeValue(fields, contribution.fields, {
        location: `${workspace}/package.json`,
        moduleId,
        owners: fieldOwners,
        path: '',
      }) as Record<string, unknown>;

      this.mergeStringMap(scripts, contribution.scripts, moduleId, `${workspace}/package.json scripts`);
      for (const field of DEPENDENCY_FIELDS) {
        this.mergeStringMap(dependencies[field], contribution[field], moduleId, `${workspace}/package.json ${field}`);
      }
    }

    const packageJson: iPackageJson = { ...fields };
    if (scripts.size > 0) {
      packageJson.scripts = Object.fromEntries([...scripts].map(([key, { value }]) => [key, value]));
    }
    for (const field of DEPENDENCY_FIELDS) {
      if (dependencies[field].size === 0) continue;
      packageJson[field] = sortKeys(
        Object.fromEntries([...dependencies[field]].map(([key, { value }]) => [key, value])),
      );
    }
    return packageJson;
  }

  private mergeStringMap(
    target: Map<string, { value: string; moduleId: ModuleId }>,
    source: Record<string, string>,
    moduleId: ModuleId,
    location: string,
  ) {
    for (const [key, value] of Object.entries(source)) {
      const existing = target.get(key);
      if (existing && existing.value !== value) {
        throw new GeneratorError(
          GENERATOR_ERROR_CODES.MERGE_CONFLICT,
          `${location}: "${key}" is "${existing.value}" in "${existing.moduleId}" but "${value}" in "${moduleId}"`,
        );
      }
      if (!existing) target.set(key, { value, moduleId });
    }
  }

  /** Objects merge key by key, arrays are unioned, and differing scalars are a conflict. */
  private mergeValue(
    current: unknown,
    incoming: unknown,
    context: { location: string; moduleId: ModuleId; owners: Map<string, ModuleId>; path: string },
  ): unknown {
    if (current === undefined) {
      context.owners.set(context.path, context.moduleId);
      return incoming;
    }

    if (isPlainObject(current) && isPlainObject(incoming)) {
      const merged: Record<string, unknown> = { ...current };
      for (const [key, value] of Object.entries(incoming)) {
        merged[key] = this.mergeValue(current[key], value, {
          ...context,
          path: context.path ? `${context.path}.${key}` : key,
        });
      }
      return merged;
    }

    if (Array.isArray(current) && Array.isArray(incoming)) return unionArrays(current, incoming);

    if (isDeepStrictEqual(current, incoming)) return current;

    const owner = this.findOwner(context.owners, context.path);
    throw new GeneratorError(
      GENERATOR_ERROR_CODES.MERGE_CONFLICT,
      `${context.location}: "${context.path}" is ${JSON.stringify(current)} in "${owner}" but ${JSON.stringify(incoming)} in "${context.moduleId}"`,
    );
  }

  /** The module that first wrote `fieldPath` or the closest object containing it. */
  private findOwner(owners: Map<string, ModuleId>, fieldPath: string) {
    const segments = fieldPath.split('.');
    while (segments.length > 0) {
      const owner = owners.get(segments.join('.'));
      if (owner) return owner;
      segments.pop();
    }
    return 'another module';
  }
}
