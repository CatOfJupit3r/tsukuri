import { injectable } from 'tsyringe';
import { stringify } from 'yaml';

import { GENERATOR_ERROR_CODES } from '#~/enums/generator-error-codes.enums';
import type { ModuleId } from '#~/enums/module-ids.enums';
import type { iPnpmWorkspaceContribution } from '#~/manifest/module-manifest.schema';

import { GeneratorError } from '../generator-error';
import type { iOwnedContribution, iPackageJson } from './package-json-merger';
import { DEPENDENCY_FIELDS } from './package-json-merger';

export interface iPnpmWorkspace {
  packages: string[];
  catalog: Record<string, string>;
  allowBuilds: Record<string, boolean>;
  onlyBuiltDependencies: string[];
  minimumReleaseAgeExclude: string[];
}

const CATALOG_PROTOCOL = 'catalog:';

function union(target: string[], values: string[]) {
  for (const value of values) {
    if (!target.includes(value)) target.push(value);
  }
}

interface iOwnedRecordMerge<T> {
  /** The module that first set each key, for conflict messages. */
  owners: Map<string, ModuleId>;
  moduleId: ModuleId;
  describeConflict: (name: string, existing: T, incoming: T, owner: ModuleId | undefined) => string;
}

/** `current` with `source` merged in; a key two modules set to different values is a conflict. */
function mergeOwnedRecord<T>(
  current: Record<string, T>,
  source: Record<string, T>,
  { owners, moduleId, describeConflict }: iOwnedRecordMerge<T>,
) {
  const merged = { ...current };
  for (const [name, value] of Object.entries(source)) {
    const existing = merged[name];
    if (existing !== undefined && existing !== value) {
      throw new GeneratorError(
        GENERATOR_ERROR_CODES.MERGE_CONFLICT,
        describeConflict(name, existing, value, owners.get(name)),
      );
    }
    merged[name] = value;
    if (!owners.has(name)) owners.set(name, moduleId);
  }
  return merged;
}

@injectable()
export class PnpmWorkspaceMerger {
  public merge(contributions: iOwnedContribution<iPnpmWorkspaceContribution>[]): iPnpmWorkspace {
    const workspace: iPnpmWorkspace = {
      packages: [],
      catalog: {},
      allowBuilds: {},
      onlyBuiltDependencies: [],
      minimumReleaseAgeExclude: [],
    };
    const catalogOwners = new Map<string, ModuleId>();
    const allowBuildOwners = new Map<string, ModuleId>();

    for (const { moduleId, contribution } of contributions) {
      union(workspace.packages, contribution.packages);
      union(workspace.onlyBuiltDependencies, contribution.onlyBuiltDependencies);
      union(workspace.minimumReleaseAgeExclude, contribution.minimumReleaseAgeExclude);

      workspace.catalog = mergeOwnedRecord(workspace.catalog, contribution.catalog, {
        owners: catalogOwners,
        moduleId,
        describeConflict: (name, existing, version, owner) =>
          `pnpm catalog: "${name}" is "${existing}" in "${owner}" but "${version}" in "${moduleId}"`,
      });
      workspace.allowBuilds = mergeOwnedRecord(workspace.allowBuilds, contribution.allowBuilds, {
        owners: allowBuildOwners,
        moduleId,
        describeConflict: (name, isAlreadyAllowed, isAllowed, owner) =>
          `pnpm allowBuilds: "${name}" is ${isAlreadyAllowed} in "${owner}" but ${isAllowed} in "${moduleId}"`,
      });
    }

    return workspace;
  }

  /** Every `catalog:` dependency must have a catalog entry, or `pnpm install` fails later. */
  public assertCatalogCoverage(workspace: iPnpmWorkspace, packageJsons: Map<string, iPackageJson>) {
    const missing = [...packageJsons].flatMap(([workspaceDir, packageJson]) =>
      DEPENDENCY_FIELDS.flatMap((field) =>
        Object.entries((packageJson[field] ?? {}) as Record<string, string>)
          .filter(([name, version]) => version === CATALOG_PROTOCOL && workspace.catalog[name] === undefined)
          .map(([name]) => `${name} (${workspaceDir}/package.json ${field})`),
      ),
    );

    if (missing.length > 0) {
      throw new GeneratorError(
        GENERATOR_ERROR_CODES.MISSING_CATALOG_ENTRY,
        `No module provides a catalog entry for: ${missing.join(', ')}`,
      );
    }
  }

  public serialize(workspace: iPnpmWorkspace) {
    const document: Record<string, unknown> = { packages: workspace.packages };
    if (Object.keys(workspace.allowBuilds).length > 0) document.allowBuilds = workspace.allowBuilds;
    if (Object.keys(workspace.catalog).length > 0) document.catalog = workspace.catalog;
    if (workspace.minimumReleaseAgeExclude.length > 0) {
      document.minimumReleaseAgeExclude = workspace.minimumReleaseAgeExclude;
    }
    if (workspace.onlyBuiltDependencies.length > 0) document.onlyBuiltDependencies = workspace.onlyBuiltDependencies;
    return stringify(document);
  }
}
