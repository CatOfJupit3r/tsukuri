import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { createGeneratorContainer } from '#~/di/container';
import { ModuleResolver } from '#~/engine/module-resolver';
import { DEPENDENCY_FIELDS, PackageJsonMerger } from '#~/engine/package-json-merger';
import type { iModuleManifest } from '#~/manifest/module-manifest.schema';
import { moduleManifestSchema } from '#~/manifest/module-manifest.schema';
import { MODULE_MANIFESTS } from '#~/modules/module-manifests';
import { SERVER_PACKAGE_NAME } from '#~/modules/node-hono.module';

import { REPOSITORY_ROOT } from '../helpers/temp-dir';

const ROOT_WORKSPACE = '.';
const WORKER_WORKSPACE = 'apps/worker';
/** The repository workspace that installs the Worker's dependencies to type-check and lint its sources. */
const WORKER_CHECK_WORKSPACE = 'variants/cloudflare-worker';
const WORKSPACE_PROTOCOL = 'workspace:*';

const manifests = MODULE_MANIFESTS.map((input) => moduleManifestSchema.parse(input));
const resolver = createGeneratorContainer({ sourceRoot: REPOSITORY_ROOT }).resolve(ModuleResolver);
const merger = new PackageJsonMerger();

function contributionsOf(modules: readonly iModuleManifest[]) {
  return modules.flatMap((manifest) =>
    manifest.packageJson.map((contribution) => ({ moduleId: manifest.id, contribution })),
  );
}

function readPackageJson(workspace: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path.join(REPOSITORY_ROOT, workspace, 'package.json'), 'utf8'));
}

const coexistingPairs = manifests.flatMap((left, index) =>
  manifests
    .slice(index + 1)
    .filter((right) => resolver.isCompatible([left.id], right.id))
    .map((right) => ({ name: `${left.id} + ${right.id}`, modules: [left, right] })),
);

/**
 * Manifests declare package.json contents explicitly. Modules that can be installed together must never
 * give one script or dependency different values in any workspace, the root included; only alternatives
 * (one database or another) may. The real package.json files in this repository are the union of every
 * module contributing to that workspace; the root one also carries repo-only scripts and is not compared.
 */
describe('module package.json contributions', () => {
  it.each(coexistingPairs)('$name agree on every package.json they share', ({ modules }) => {
    expect(() => merger.merge(contributionsOf(modules))).not.toThrow();
  });

  const composed = merger.merge(
    contributionsOf(manifests).filter(({ contribution }) => contribution.workspace !== ROOT_WORKSPACE),
  );
  const workspaces = [...composed.keys()].filter((workspace) =>
    existsSync(path.join(REPOSITORY_ROOT, workspace, 'package.json')),
  );

  it.each(workspaces)('%s matches the repository package.json', (workspace) => {
    expect(composed.get(workspace)).toEqual(readPackageJson(workspace));
  });

  it(`checks the Worker sources against the packages ${WORKER_WORKSPACE} installs`, () => {
    const worker = composed.get(WORKER_WORKSPACE) ?? {};
    const installed = Object.assign({}, ...DEPENDENCY_FIELDS.map((field) => worker[field] ?? {}));

    // Besides those, it links the package whose files the Worker shares.
    expect(readPackageJson(WORKER_CHECK_WORKSPACE).devDependencies).toEqual({
      ...installed,
      [SERVER_PACKAGE_NAME]: WORKSPACE_PROTOCOL,
    });
  });
});
