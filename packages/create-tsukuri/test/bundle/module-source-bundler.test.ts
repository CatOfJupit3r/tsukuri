import { existsSync } from 'node:fs';
import path from 'node:path';

import { ModuleSourceBundler } from '#~/bundle/module-source-bundler';
import { createGeneratorContainer } from '#~/di/container';
import { ProjectGenerator } from '#~/engine/project-generator';
import type { VirtualProject } from '#~/engine/virtual-project';
import type { Capability } from '#~/enums/capabilities.enums';
import type { ModuleId } from '#~/enums/module-ids.enums';
import { SOURCE_LAYOUTS } from '#~/enums/source-layouts.enums';
import type { iModuleManifestInput } from '#~/manifest/module-manifest.schema';
import { MODULE_MANIFESTS } from '#~/modules/module-manifests';
import type { iProjectRecord } from '#~/record/project-record.schema';

import { REPOSITORY_ROOT, useTempDir } from '../helpers/temp-dir';

/** Composes every module twice from disk, which is slow while other workspaces test in parallel. */
const COMPOSE_EVERY_MODULE_TIMEOUT_MS = 90_000;

const MANIFESTS_BY_ID = new Map(MODULE_MANIFESTS.map((manifest) => [manifest.id, manifest]));

function isCapabilityProvided(selected: Set<ModuleId>, capability: Capability) {
  return [...selected].some((id) => MANIFESTS_BY_ID.get(id)?.provides?.includes(capability));
}

/**
 * The module (or the modules a glue module installs with) and what they require; a required
 * capability nothing selected provides takes the first module that provides it.
 */
function selectionFor(manifest: iModuleManifestInput) {
  const selected = new Set<ModuleId>(manifest.autoInclude?.modules ?? [manifest.id]);
  for (const id of selected) {
    const selectedManifest = MANIFESTS_BY_ID.get(id);
    for (const required of selectedManifest?.requires ?? []) selected.add(required);
    for (const capability of selectedManifest?.requiresCapabilities ?? []) {
      const provider = MODULE_MANIFESTS.find((candidate) => candidate.provides?.includes(capability));
      if (provider && !isCapabilityProvided(selected, capability)) selected.add(provider.id);
    }
  }
  return MODULE_MANIFESTS.filter((candidate) => selected.has(candidate.id));
}

function recordFor(manifest: iModuleManifestInput): iProjectRecord {
  return {
    projectName: 'acme',
    generator: { name: 'create-tsukuri', version: '0.0.0' },
    modules: selectionFor(manifest).map(({ id, version }) => ({ id, version, options: {} })),
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
