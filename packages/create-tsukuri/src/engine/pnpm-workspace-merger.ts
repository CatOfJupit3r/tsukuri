import { injectable } from 'tsyringe';
import { stringify } from 'yaml';

import { GENERATOR_ERROR_CODES } from '#~/enums/generator-error-codes.enums';
import type { ModuleId } from '#~/enums/module-ids.enums';
import type { iPnpmWorkspaceContribution } from '#~/manifest/module-manifest.schema';

import { GeneratorError } from './generator-error';
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

      for (const [name, version] of Object.entries(contribution.catalog)) {
        const existing = workspace.catalog[name];
        if (existing !== undefined && existing !== version) {
          throw new GeneratorError(
            GENERATOR_ERROR_CODES.MERGE_CONFLICT,
            `pnpm catalog: "${name}" is "${existing}" in "${catalogOwners.get(name)}" but "${version}" in "${moduleId}"`,
          );
        }
        workspace.catalog[name] = version;
        if (!catalogOwners.has(name)) catalogOwners.set(name, moduleId);
      }

      for (const [name, isAllowed] of Object.entries(contribution.allowBuilds)) {
        const isAlreadyAllowed = workspace.allowBuilds[name];
        if (isAlreadyAllowed !== undefined && isAlreadyAllowed !== isAllowed) {
          throw new GeneratorError(
            GENERATOR_ERROR_CODES.MERGE_CONFLICT,
            `pnpm allowBuilds: "${name}" is ${isAlreadyAllowed} in "${allowBuildOwners.get(name)}" but ${isAllowed} in "${moduleId}"`,
          );
        }
        workspace.allowBuilds[name] = isAllowed;
        if (!allowBuildOwners.has(name)) allowBuildOwners.set(name, moduleId);
      }
    }

    return workspace;
  }

  /** Every `catalog:` dependency must have a catalog entry, or `pnpm install` fails later. */
  public assertCatalogCoverage(workspace: iPnpmWorkspace, packageJsons: Map<string, iPackageJson>) {
    const missing: string[] = [];

    for (const [workspaceDir, packageJson] of packageJsons) {
      for (const field of DEPENDENCY_FIELDS) {
        const dependencies = (packageJson[field] ?? {}) as Record<string, string>;
        for (const [name, version] of Object.entries(dependencies)) {
          if (version === CATALOG_PROTOCOL && workspace.catalog[name] === undefined) {
            missing.push(`${name} (${workspaceDir}/package.json ${field})`);
          }
        }
      }
    }

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
