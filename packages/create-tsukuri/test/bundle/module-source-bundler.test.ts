import { existsSync } from 'node:fs';
import path from 'node:path';

import { ModuleSourceBundler } from '#~/bundle/module-source-bundler';
import { createGeneratorContainer } from '#~/di/container';
import { ProjectGenerator } from '#~/engine/project-generator';
import type { VirtualProject } from '#~/engine/virtual-project';
import { SOURCE_LAYOUTS } from '#~/enums/source-layouts.enums';
import type { iModuleManifestInput } from '#~/manifest/module-manifest.schema';
import { MODULE_MANIFESTS } from '#~/modules/module-manifests';
import type { iProjectRecord } from '#~/record/project-record.schema';

import { REPOSITORY_ROOT, useTempDir } from '../helpers/temp-dir';

/** Composes every module twice from disk, which is slow while other workspaces test in parallel. */
const COMPOSE_EVERY_MODULE_TIMEOUT_MS = 90_000;

function recordFor(manifest: iModuleManifestInput): iProjectRecord {
  return {
    projectName: 'acme',
    generator: { name: 'create-tsukuri', version: '0.0.0' },
    modules: [{ id: manifest.id, version: manifest.version, options: {} }],
    skills: { excluded: [] },
    markdown: { includePrivate: false },
  };
}

function contentsOf(project: VirtualProject) {
  return project.entries().map(([filePath, file]) => [filePath, file.content.toString('base64')]);
}

describe('ModuleSourceBundler', () => {
  const createTempDir = useTempDir();

  it(
    'bundles every source a module needs, so each module composes the same from the bundle',
    async () => {
      const bundleRoot = path.join(await createTempDir(), 'sources');
      await createGeneratorContainer({ sourceRoot: REPOSITORY_ROOT }).resolve(ModuleSourceBundler).bundle(bundleRoot);

      const fromRepository = createGeneratorContainer({ sourceRoot: REPOSITORY_ROOT }).resolve(ProjectGenerator);
      const fromBundle = createGeneratorContainer({
        sourceRoot: bundleRoot,
        sourceLayout: SOURCE_LAYOUTS.BUNDLE,
      }).resolve(ProjectGenerator);

      for (const manifest of MODULE_MANIFESTS) {
        const expected = contentsOf(await fromRepository.compose(recordFor(manifest)));
        expect(contentsOf(await fromBundle.compose(recordFor(manifest))), manifest.id).toEqual(expected);
      }
    },
    COMPOSE_EVERY_MODULE_TIMEOUT_MS,
  );

  it('stores the files npm handles specially under escaped names', async () => {
    const bundleRoot = path.join(await createTempDir(), 'sources');
    await createGeneratorContainer({ sourceRoot: REPOSITORY_ROOT }).resolve(ModuleSourceBundler).bundle(bundleRoot);

    expect(existsSync(path.join(bundleRoot, '_gitignore'))).toBe(true);
    expect(existsSync(path.join(bundleRoot, '.gitignore'))).toBe(false);
  });
});
