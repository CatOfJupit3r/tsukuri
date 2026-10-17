import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { PackageJsonMerger } from '@~/engine/package-json-merger';
import { moduleManifestSchema } from '@~/manifest/module-manifest.schema';
import { MODULE_MANIFESTS } from '@~/modules/module-manifests';

import { REPOSITORY_ROOT } from '../helpers/temp-dir';

const ROOT_WORKSPACE = '.';

/**
 * Manifests declare package.json contents explicitly, so they must stay in step with the real
 * package.json files in this repository, which are the union of every module contributing to
 * that workspace. The root package.json also carries repo-only scripts and is not compared.
 */
describe('module package.json contributions', () => {
  const manifests = MODULE_MANIFESTS.map((input) => moduleManifestSchema.parse(input));
  const composed = new PackageJsonMerger().merge(
    manifests.flatMap((manifest) =>
      manifest.packageJson.map((contribution) => ({ moduleId: manifest.id, contribution })),
    ),
  );
  const workspaces = [...composed.keys()].filter(
    (workspace) => workspace !== ROOT_WORKSPACE && existsSync(path.join(REPOSITORY_ROOT, workspace, 'package.json')),
  );

  it.each(workspaces)('%s matches the repository package.json', (workspace) => {
    const actual: unknown = JSON.parse(readFileSync(path.join(REPOSITORY_ROOT, workspace, 'package.json'), 'utf8'));

    expect(composed.get(workspace)).toEqual(actual);
  });
});
