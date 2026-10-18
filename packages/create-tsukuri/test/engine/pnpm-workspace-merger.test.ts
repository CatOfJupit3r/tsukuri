import { parse } from 'yaml';

import { PnpmWorkspaceMerger } from '@~/engine/pnpm-workspace-merger';
import { GENERATOR_ERROR_CODES } from '@~/enums/generator-error-codes.enums';
import { pnpmWorkspaceContributionSchema } from '@~/manifest/module-manifest.schema';
import type { iPnpmWorkspaceContribution } from '@~/manifest/module-manifest.schema';

import { testModuleId } from '../helpers/manifests';

vi.mock('@~/enums/module-ids.enums', () => import('../helpers/test-module-ids'));

const ALPHA = testModuleId('alpha');
const BETA = testModuleId('beta');

function contribution(input: Partial<iPnpmWorkspaceContribution>) {
  return pnpmWorkspaceContributionSchema.parse(input);
}

describe('PnpmWorkspaceMerger', () => {
  const merger = new PnpmWorkspaceMerger();

  it('unions workspace globs and merges catalogs', () => {
    const workspace = merger.merge([
      { moduleId: ALPHA, contribution: contribution({ packages: ['packages/*'], catalog: { zod: '4.4.3' } }) },
      {
        moduleId: BETA,
        contribution: contribution({
          packages: ['apps/*', 'packages/*'],
          catalog: { zod: '4.4.3', hono: '4.12.29' },
          allowBuilds: { esbuild: true },
        }),
      },
    ]);

    expect(parse(merger.serialize(workspace))).toEqual({
      packages: ['packages/*', 'apps/*'],
      allowBuilds: { esbuild: true },
      catalog: { zod: '4.4.3', hono: '4.12.29' },
    });
  });

  it('names both modules when catalog versions disagree', () => {
    expect(() =>
      merger.merge([
        { moduleId: ALPHA, contribution: contribution({ catalog: { zod: '4.4.3' } }) },
        { moduleId: BETA, contribution: contribution({ catalog: { zod: '3.0.0' } }) },
      ]),
    ).toThrow(
      expect.objectContaining({
        code: GENERATOR_ERROR_CODES.MERGE_CONFLICT,
        message: 'pnpm catalog: "zod" is "4.4.3" in "alpha" but "3.0.0" in "beta"',
      }),
    );
  });

  it('requires a catalog entry for every catalog: dependency', () => {
    const workspace = merger.merge([{ moduleId: ALPHA, contribution: contribution({ catalog: { zod: '4.4.3' } }) }]);

    expect(() =>
      merger.assertCatalogCoverage(
        workspace,
        new Map([['apps/server', { dependencies: { zod: 'catalog:', hono: 'catalog:', pg: '^8.0.0' } }]]),
      ),
    ).toThrow(
      expect.objectContaining({
        code: GENERATOR_ERROR_CODES.MISSING_CATALOG_ENTRY,
        message: expect.stringContaining('hono (apps/server/package.json dependencies)'),
      }),
    );
  });
});
