import { listDependencyEntries, PackageJsonMerger } from '#~/engine/merge/package-json-merger';
import { PnpmWorkspaceMerger } from '#~/engine/merge/pnpm-workspace-merger';
import { ROOT_WORKSPACE } from '#~/engine/project-composer';
import { moduleManifestSchema } from '#~/manifest/module-manifest.schema';
import { MODULE_MANIFESTS } from '#~/modules/module-manifests';

import {
  listRepositoryDependencies,
  readRepositoryCatalog,
  readRepositoryPackageJson,
  readRepositoryPackageJsonFile,
} from '../helpers/repository-files';
import {
  CATALOG_REFERENCE,
  EXACT_VERSION_PATTERN,
  LINT_TOOLCHAIN_WORKSPACES,
  ROOT_LINT_TOOL_NAMES,
  ROOT_REPOSITORY_ONLY_DEPENDENCY_NAMES,
  WORKSPACE_REFERENCE_PATTERN,
} from '../helpers/repository-sync.constants';

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
    expect(composed.get(workspace)).toEqual(readRepositoryPackageJsonFile(workspace));
  });

  const shippedDependencies = contributions.flatMap(({ moduleId, contribution }) =>
    listDependencyEntries(contribution).map((dependency) => ({
      ...dependency,
      label: `${moduleId} ${contribution.workspace} ${dependency.field} ${dependency.name}`,
      workspace: contribution.workspace,
    })),
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

  // Alternative modules ship different root dependencies, so the root is compared by name: whatever the repository
  // root depends on must be shipped by some module.
  it('ships every dependency the repository root package.json declares except the release tooling', () => {
    const shippedRootNames = new Set(
      shippedDependencies.filter(({ workspace }) => workspace === ROOT_WORKSPACE).map(({ name }) => name),
    );
    const missing = listRepositoryDependencies(ROOT_WORKSPACE)
      .filter(({ name }) => !shippedRootNames.has(name) && !ROOT_REPOSITORY_ONLY_DEPENDENCY_NAMES.includes(name))
      .map(({ field, name }) => `${field} ${name}`);

    expect(readRepositoryPackageJson(ROOT_WORKSPACE)).toBeDefined();
    expect(missing).toEqual([]);
  });
});

describe('repository root package.json', () => {
  const rootDependencies = listRepositoryDependencies(ROOT_WORKSPACE);

  it.each(ROOT_REPOSITORY_ONLY_DEPENDENCY_NAMES)(
    'repository-only dependency %s is still declared by the root',
    (name) => {
      expect(rootDependencies.map((dependency) => dependency.name)).toContain(name);
    },
  );

  it.each(
    rootDependencies.filter(
      ({ version }) => version !== CATALOG_REFERENCE && !WORKSPACE_REFERENCE_PATTERN.test(version),
    ),
  )('root $field $name is an exact pin', ({ version }) => {
    expect(version).toMatch(EXACT_VERSION_PATTERN);
  });
});

describe('pnpm catalog contributions', () => {
  it.each(Object.entries(generatedCatalog))('generated %s pin equals the repository catalog', (name, version) => {
    expect(repositoryCatalog[name]).toBe(version);
  });

  it('ships every repository catalog entry', () => {
    const generatedCatalogNames = new Set(Object.keys(generatedCatalog));
    const missing = Object.keys(repositoryCatalog).filter((name) => !generatedCatalogNames.has(name));

    expect(missing).toEqual([]);
  });

  it.each(Object.keys(repositoryCatalog))('catalog entry %s is an exact pin', (name) => {
    expect(repositoryCatalog[name]).toMatch(EXACT_VERSION_PATTERN);
  });
});

describe('lint and format toolchain pins', () => {
  const workspaceDependencies = LINT_TOOLCHAIN_WORKSPACES.flatMap((workspace) =>
    listRepositoryDependencies(workspace).map((dependency) => ({
      ...dependency,
      label: `${workspace} ${dependency.field} ${dependency.name}`,
    })),
  );
  const rootDependencies = listRepositoryDependencies(ROOT_WORKSPACE)
    .filter(({ name }) => ROOT_LINT_TOOL_NAMES.includes(name))
    .map((dependency) => ({ ...dependency, label: `${ROOT_WORKSPACE} ${dependency.field} ${dependency.name}` }));
  const toolchainDependencies = [...workspaceDependencies, ...rootDependencies];

  it.each(LINT_TOOLCHAIN_WORKSPACES)('%s has a package.json to check', (workspace) => {
    expect(readRepositoryPackageJson(workspace)).toBeDefined();
  });

  it('finds every named root lint tool in the repository root package.json', () => {
    expect(rootDependencies.map(({ name }) => name).sort()).toEqual([...ROOT_LINT_TOOL_NAMES].sort());
  });

  it.each(toolchainDependencies.filter(({ version }) => version !== CATALOG_REFERENCE))(
    '$label is an exact pin',
    ({ version }) => {
      expect(version).toMatch(EXACT_VERSION_PATTERN);
    },
  );
});
