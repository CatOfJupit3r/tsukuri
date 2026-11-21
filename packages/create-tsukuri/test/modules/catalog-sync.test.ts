import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import { z } from 'zod';

import { PnpmWorkspaceMerger } from '#~/engine/merge/pnpm-workspace-merger';
import { moduleManifestSchema } from '#~/manifest/module-manifest.schema';
import { MODULE_MANIFESTS } from '#~/modules/module-manifests';

import { REPOSITORY_ROOT } from '../helpers/temp-dir';

const LINT_TOOLCHAIN_CATALOG_ENTRIES = ['eslint', 'oxlint', 'oxlint-tsgolint', '@typescript/native-preview'];
const EXACT_VERSION_PATTERN = /^\d+\.\d+\.\d+(-[\w.]+)?$/;

const repositoryWorkspaceSchema = z.object({ catalog: z.record(z.string(), z.string()) });

describe('pnpm catalog contributions', () => {
  const manifests = moduleManifestSchema.array().parse(MODULE_MANIFESTS);
  const generatedCatalog = new PnpmWorkspaceMerger().merge(
    manifests.map((manifest) => ({ moduleId: manifest.id, contribution: manifest.pnpmWorkspace })),
  ).catalog;
  const repositoryCatalog = repositoryWorkspaceSchema.parse(
    parse(readFileSync(path.join(REPOSITORY_ROOT, 'pnpm-workspace.yaml'), 'utf8')),
  ).catalog;

  it.each(Object.entries(generatedCatalog))('generated %s pin equals the repository catalog', (name, version) => {
    expect(repositoryCatalog[name]).toBe(version);
  });

  it.each(LINT_TOOLCHAIN_CATALOG_ENTRIES)('%s is an exact pin in the generated catalog', (name) => {
    expect(generatedCatalog[name]).toMatch(EXACT_VERSION_PATTERN);
  });
});
