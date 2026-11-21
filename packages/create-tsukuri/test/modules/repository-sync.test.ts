import { readFileSync } from 'node:fs';
import path from 'node:path';

import { DEPENDENCY_FIELDS, PackageJsonMerger } from '#~/engine/merge/package-json-merger';
import { PnpmWorkspaceMerger } from '#~/engine/merge/pnpm-workspace-merger';
import { moduleManifestSchema } from '#~/manifest/module-manifest.schema';
import { MODULE_MANIFESTS } from '#~/modules/module-manifests';

import { readRepositoryCatalog, readRepositoryPackageJson } from '../helpers/repository-files';
import {
  CATALOG_REFERENCE,
  EXACT_VERSION_PATTERN,
  LINT_TOOLCHAIN_EXTRA_CATALOG_ENTRIES,
  LINT_TOOLCHAIN_WORKSPACES,
  REPOSITORY_ONLY_CATALOG_ENTRIES,
  ROOT_WORKSPACE,
} from '../helpers/repository-sync.constants';
import { REPOSITORY_ROOT } from '../helpers/temp-dir';

/**
 * Manifests declare package.json and catalog contents explicitly, so everything they ship must stay in step with
 * the files of this repository, which are the union of every module contributing to them.
 */
const manifests = MODULE_MANIFESTS.map((input) => moduleManifestSchema.parse(input));
const contributions = manifests.flatMap((manifest) =>
  manifest.packageJson.map((contribution) => ({ moduleId: manifest.id, contribution })),
);
const generatedCatalog = new PnpmWorkspaceMerger().merge(
  manifests.map((manifest) => ({ moduleId: manifest.id, contribution: manifest.pnpmWorkspace })),
).catalog;
const repositoryCatalog = readRepositoryCatalog();

describe('module package.json contributions', () => {
  // Alternative modules (one database or another) may give the same root script different commands, and the
  // root package.json also carries repo-only scripts, so the root is compared by dependency below instead.
  const composed = new PackageJsonMerger().merge(
    contributions.filter(({ contribution }) => contribution.workspace !== ROOT_WORKSPACE),
  );
  const workspaces = [...composed.keys()].filter((workspace) => readRepositoryPackageJson(workspace) !== undefined);

  it.each(workspaces)('%s matches the repository package.json', (workspace) => {
    const actual: unknown = JSON.parse(readFileSync(path.join(REPOSITORY_ROOT, workspace, 'package.json'), 'utf8'));

    expect(composed.get(workspace)).toEqual(actual);
  });

  const shippedDependencies = contributions.flatMap(({ moduleId, contribution }) =>
    DEPENDENCY_FIELDS.flatMap((field) =>
      Object.entries(contribution[field]).map(([name, version]) => ({
        label: `${moduleId} ${contribution.workspace} ${field} ${name}`,
        workspace: contribution.workspace,
        field,
        name,
        version,
      })),
    ),
  );

  it('ships every dependency version the repository package.json uses', () => {
    const mismatches = shippedDependencies
      .filter(({ workspace, field, name, version }) => {
        const repositoryVersion = readRepositoryPackageJson(workspace)?.[field][name];
        return repositoryVersion !== undefined && repositoryVersion !== version;
      })
      .map(({ label, version }) => `${label}: ${version}`);

    expect(mismatches).toEqual([]);
  });
});

describe('pnpm catalog contributions', () => {
  it.each(Object.entries(generatedCatalog))('generated %s pin equals the repository catalog', (name, version) => {
    expect(repositoryCatalog[name]).toBe(version);
  });

  it('ships every repository catalog entry except the repository-only ones', () => {
    const missing = Object.keys(repositoryCatalog).filter(
      (name) => !(name in generatedCatalog) && !REPOSITORY_ONLY_CATALOG_ENTRIES.includes(name),
    );

    expect(missing).toEqual([]);
  });
});

describe('lint and format toolchain pins', () => {
  const toolchainDependencies = LINT_TOOLCHAIN_WORKSPACES.flatMap((workspace) =>
    DEPENDENCY_FIELDS.flatMap((field) =>
      Object.entries(readRepositoryPackageJson(workspace)?.[field] ?? {}).map(([name, version]) => ({
        label: `${workspace} ${field} ${name}`,
        name,
        version,
      })),
    ),
  );
  const catalogEntries = [
    ...toolchainDependencies.filter(({ version }) => version === CATALOG_REFERENCE).map(({ name }) => name),
    ...LINT_TOOLCHAIN_EXTRA_CATALOG_ENTRIES,
  ];

  it.each(toolchainDependencies.filter(({ version }) => version !== CATALOG_REFERENCE))(
    '$label is an exact pin',
    ({ version }) => {
      expect(version).toMatch(EXACT_VERSION_PATTERN);
    },
  );

  it.each(catalogEntries)('toolchain catalog entry %s is an exact pin', (name) => {
    expect(repositoryCatalog[name]).toMatch(EXACT_VERSION_PATTERN);
  });
});
