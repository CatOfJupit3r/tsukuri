import { createGeneratorContainer } from '#~/di/container';
import { ProjectGenerator } from '#~/engine/project-generator';
import type { VirtualProject } from '#~/engine/virtual-project';
import { CONNECTION_POINT_KINDS } from '#~/enums/connection-point-kinds.enums';
import { MARKDOWN_DOCUMENTS } from '#~/enums/markdown-documents.enums';
import type { iModuleManifestInput } from '#~/manifest/module-manifest.schema';
import { baseModule } from '#~/modules/base.module';
import type { iProjectRecord } from '#~/record/project-record.schema';

import { createManifest, testModuleId } from '../helpers/manifests';
import { REPOSITORY_ROOT } from '../helpers/temp-dir';

vi.mock('#~/enums/module-ids.enums', () => import('../helpers/test-module-ids'));

const ALPHA = testModuleId('alpha');

const alphaModule: iModuleManifestInput = createManifest(ALPHA, {
  files: [{ source: 'scripts/clean.ts', target: 'apps/api/src/clean.ts' }],
  packageJson: [{ workspace: 'apps/api', fields: { name: '@startername/api' }, scripts: { dev: 'node src/clean.ts' } }],
  pnpmWorkspace: { packages: ['apps/*'] },
  markdown: [
    { document: MARKDOWN_DOCUMENTS.README, source: 'packages/create-tsukuri/templates/fragments/base/readme.md.hbs' },
  ],
  contributions: [
    {
      kind: CONNECTION_POINT_KINDS.ROUTER,
      workspace: 'apps/api',
      key: 'clean',
      router: { name: 'cleanRouter', from: '#~/clean' },
    },
    { kind: CONNECTION_POINT_KINDS.ENV_VARIABLE, workspace: 'apps/api', name: 'API_PORT', schema: 'z.coerce.number()' },
    { kind: CONNECTION_POINT_KINDS.COMPOSE_SERVICE, name: 'cache', service: { image: 'valkey/valkey:8' } },
    { kind: CONNECTION_POINT_KINDS.DEV_TASK, filter: '@startername/api' },
  ],
});

function record(moduleIds: string[]): iProjectRecord {
  return {
    projectName: 'acme',
    generator: { name: 'create-tsukuri', version: '0.0.0' },
    modules: moduleIds.map((id) => ({ id: testModuleId(id), version: '1.0.0', options: {} })),
    skills: { excluded: [] },
    markdown: { includePrivate: false },
  };
}

function snapshot(project: VirtualProject) {
  return new Map(project.entries().map(([filePath, file]) => [filePath, file]));
}

describe('regenerating from the module record', () => {
  const generator = createGeneratorContainer({
    sourceRoot: REPOSITORY_ROOT,
    manifests: [baseModule, alphaModule],
  }).resolve(ProjectGenerator);

  it('produces identical output for the same record', async () => {
    const first = await generator.compose(record(['base', 'alpha']));
    const second = await generator.compose(record(['base', 'alpha']));

    expect(second.paths()).toEqual(first.paths());
    for (const [filePath, file] of first.entries()) {
      expect(second.get(filePath)?.content.equals(file.content), filePath).toBe(true);
    }
  });

  it('only changes generated files and the added module files when a module is added', async () => {
    const before = snapshot(await generator.compose(record(['base'])));
    const after = snapshot(await generator.compose(record(['base', 'alpha'])));

    const changed = [...after].filter(([filePath, file]) => !before.get(filePath)?.content.equals(file.content));
    const removed = [...before.keys()].filter((filePath) => !after.has(filePath));

    expect(removed).toEqual([]);
    expect(changed.map(([filePath]) => filePath)).toEqual(
      expect.arrayContaining([
        'starter.json',
        'package.json',
        'pnpm-workspace.yaml',
        'README.md',
        'docker-compose.dev.yml',
        'apps/api/src/generated/routers.ts',
        'apps/api/src/generated/env.schema.ts',
        '.env.example',
        'apps/api/package.json',
        'apps/api/src/clean.ts',
      ]),
    );

    // Files that belong to an already installed module are never touched.
    const touchedBaseFiles = changed.filter(([, file]) => file.moduleId === baseModule.id);
    expect(touchedBaseFiles.map(([filePath]) => filePath)).toEqual([]);
  });

  it('records the installed modules and honours excluded skills', async () => {
    const project = await generator.compose({ ...record(['base']), skills: { excluded: [] } });
    const withoutSkill = await generator.compose({
      ...record(['base']),
      skills: { excluded: baseModule.skills ?? [] },
    });

    const recorded = JSON.parse(project.get('starter.json')?.content.toString('utf8') ?? '{}') as iProjectRecord;
    expect(recorded.modules.map((module) => module.id)).toEqual(['base']);
    expect(project.paths().some((filePath) => filePath.startsWith('.agents/skills/review-code/'))).toBe(true);
    expect(withoutSkill.paths().some((filePath) => filePath.startsWith('.agents/skills/'))).toBe(false);
  });
});
