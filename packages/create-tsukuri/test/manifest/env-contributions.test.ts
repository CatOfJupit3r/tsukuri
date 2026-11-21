import { CONNECTION_POINT_KINDS } from '#~/enums/connection-point-kinds.enums';
import { envVariableContributionSchema } from '#~/manifest/connection-point.schema';
import { moduleManifestSchema } from '#~/manifest/module-manifest.schema';
import type { iModuleManifestInput } from '#~/manifest/module-manifest.schema';

import { createManifest, testModuleId } from '../helpers/manifests';

vi.mock('#~/enums/module-ids.enums', () => import('../helpers/test-module-ids'));

const ALPHA = testModuleId('alpha');

function manifestWithShape(
  files: iModuleManifestInput['files'],
  shape: { workspace: string; from: string },
): iModuleManifestInput {
  return createManifest(ALPHA, {
    files,
    contributions: [
      {
        kind: CONNECTION_POINT_KINDS.ENV_SHAPE,
        workspace: shape.workspace,
        shape: { name: 'alphaEnvShape', from: shape.from },
      },
    ],
  });
}

describe('env contributions in a manifest', () => {
  it('rejects an env shape file that the root variants folder writes', () => {
    const manifest = manifestWithShape([{ source: 'variants/cloudflare-worker/apps/worker', target: 'apps/worker' }], {
      workspace: 'apps/worker',
      from: '#~/constants/worker.env',
    });

    expect(moduleManifestSchema.safeParse(manifest)).toMatchObject({
      success: false,
      error: { issues: [{ message: expect.stringContaining('root variants/ folder') }] },
    });
  });

  it('accepts an env shape file in a workspace source, or in a variants folder inside a workspace', () => {
    const inWorkspaceSource = manifestWithShape([{ source: 'apps/server/src/constants/alpha.env.ts' }], {
      workspace: 'apps/server',
      from: '#~/constants/alpha.env',
    });
    const inPackageVariants = manifestWithShape(
      [{ source: 'packages/api/variants/sqlite/src/features/sqlite/sqlite.env.ts' }],
      { workspace: 'packages/api', from: '#~/features/sqlite/sqlite.env' },
    );

    expect(moduleManifestSchema.safeParse(inWorkspaceSource).success).toBe(true);
    expect(moduleManifestSchema.safeParse(inPackageVariants).success).toBe(true);
  });

  it('rejects a stale schema or imports key on an env variable instead of dropping it', () => {
    const variable = { kind: CONNECTION_POINT_KINDS.ENV_VARIABLE, workspace: 'apps/server', name: 'PORT' };

    expect(envVariableContributionSchema.safeParse({ ...variable, schema: 'z.string()' }).success).toBe(false);
    expect(envVariableContributionSchema.safeParse({ ...variable, imports: [] }).success).toBe(false);
    expect(envVariableContributionSchema.safeParse(variable).success).toBe(true);
  });
});
