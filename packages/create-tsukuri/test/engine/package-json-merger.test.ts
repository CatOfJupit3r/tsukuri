import { PackageJsonMerger } from '@~/engine/package-json-merger';
import { GENERATOR_ERROR_CODES } from '@~/enums/generator-error-codes.enums';
import { packageJsonContributionSchema } from '@~/manifest/module-manifest.schema';
import type { iPackageJsonContribution } from '@~/manifest/module-manifest.schema';

import { testModuleId } from '../helpers/manifests';

vi.mock('@~/enums/module-ids.enums', () => import('../helpers/test-module-ids'));

const ALPHA = testModuleId('alpha');
const BETA = testModuleId('beta');

function contribution(input: Partial<iPackageJsonContribution> & { workspace: string }) {
  return packageJsonContributionSchema.parse(input);
}

describe('PackageJsonMerger', () => {
  const merger = new PackageJsonMerger();

  it('combines contributions per workspace with sorted dependencies', () => {
    const result = merger.merge([
      {
        moduleId: ALPHA,
        contribution: contribution({
          workspace: 'apps/server',
          fields: { name: 'server', type: 'module' },
          scripts: { build: 'tsdown' },
          dependencies: { zod: 'catalog:', hono: 'catalog:' },
        }),
      },
      {
        moduleId: BETA,
        contribution: contribution({
          workspace: 'apps/server',
          scripts: { 'db:migrate': 'drizzle-kit migrate' },
          dependencies: { 'drizzle-orm': '^0.45.2', zod: 'catalog:' },
          devDependencies: { 'drizzle-kit': '^0.31.10' },
        }),
      },
      { moduleId: BETA, contribution: contribution({ workspace: '.', fields: { name: 'root' } }) },
    ]);

    expect(result.get('apps/server')).toEqual({
      name: 'server',
      type: 'module',
      scripts: { build: 'tsdown', 'db:migrate': 'drizzle-kit migrate' },
      dependencies: { 'drizzle-orm': '^0.45.2', hono: 'catalog:', zod: 'catalog:' },
      devDependencies: { 'drizzle-kit': '^0.31.10' },
    });
    expect(Object.keys(result.get('apps/server')?.dependencies as object)).toEqual(['drizzle-orm', 'hono', 'zod']);
    expect(result.get('.')).toEqual({ name: 'root' });
  });

  it('deep merges object fields and unions arrays', () => {
    const result = merger.merge([
      {
        moduleId: ALPHA,
        contribution: contribution({
          workspace: '.',
          fields: { exports: { './a': './a.mjs' }, files: ['dist'] },
        }),
      },
      {
        moduleId: BETA,
        contribution: contribution({
          workspace: '.',
          fields: { exports: { './b': './b.mjs' }, files: ['dist', 'bin'] },
        }),
      },
    ]);

    expect(result.get('.')).toEqual({
      exports: { './a': './a.mjs', './b': './b.mjs' },
      files: ['dist', 'bin'],
    });
  });

  it('names both modules when a dependency version conflicts', () => {
    expect(() =>
      merger.merge([
        { moduleId: ALPHA, contribution: contribution({ workspace: 'apps/web', dependencies: { react: '19.0.0' } }) },
        { moduleId: BETA, contribution: contribution({ workspace: 'apps/web', dependencies: { react: '18.0.0' } }) },
      ]),
    ).toThrow(
      expect.objectContaining({
        code: GENERATOR_ERROR_CODES.MERGE_CONFLICT,
        message: 'apps/web/package.json dependencies: "react" is "19.0.0" in "alpha" but "18.0.0" in "beta"',
      }),
    );
  });

  it('rejects conflicting scripts and scalar fields', () => {
    expect(() =>
      merger.merge([
        { moduleId: ALPHA, contribution: contribution({ workspace: '.', scripts: { dev: 'a' } }) },
        { moduleId: BETA, contribution: contribution({ workspace: '.', scripts: { dev: 'b' } }) },
      ]),
    ).toThrow(expect.objectContaining({ code: GENERATOR_ERROR_CODES.MERGE_CONFLICT }));

    expect(() =>
      merger.merge([
        { moduleId: ALPHA, contribution: contribution({ workspace: '.', fields: { engines: { node: '24' } } }) },
        { moduleId: BETA, contribution: contribution({ workspace: '.', fields: { engines: { node: '22' } } }) },
      ]),
    ).toThrow(
      expect.objectContaining({
        message: './package.json: "engines.node" is "24" in "alpha" but "22" in "beta"',
      }),
    );
  });

  it('serializes keys in conventional package.json order', () => {
    const serialized = merger.serialize({
      devDependencies: {},
      zebra: true,
      scripts: {},
      name: 'x',
      alpha: true,
      version: '1.0.0',
    });

    expect(Object.keys(JSON.parse(serialized))).toEqual([
      'name',
      'version',
      'scripts',
      'devDependencies',
      'alpha',
      'zebra',
    ]);
    expect(serialized.endsWith('}\n')).toBe(true);
  });
});
