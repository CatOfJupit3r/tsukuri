import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';

import { createGeneratorContainer } from '#~/di/container';
import { ConnectionPointGenerator } from '#~/engine/connection-points/connection-point-generator';
import { CONNECTION_POINT_KINDS } from '#~/enums/connection-point-kinds.enums';
import { WORKER_BINDING_NAMES, WORKER_BINDING_TYPES } from '#~/enums/worker-bindings.enums';
import type { iConnectionPointContributionInput } from '#~/manifest/connection-point.schema';
import { moduleManifestSchema } from '#~/manifest/module-manifest.schema';

import { createManifest, testModuleId } from '../helpers/manifests';
import { REPOSITORY_ROOT } from '../helpers/temp-dir';

vi.mock('#~/enums/module-ids.enums', () => import('../helpers/test-module-ids'));

const WORKER_WORKSPACE = 'apps/worker';
const BINDINGS_FILE = `${WORKER_WORKSPACE}/src/generated/worker-bindings.ts`;
const TOKENS_MODULE = './tokens';
const COMPILE_TIMEOUT_MS = 60_000;

/** The Worker types the rendered file imports, reduced to what it needs to compile. */
const WORKERS_TYPES_STUB = `declare module '@cloudflare/workers-types' {
  export interface D1Database { readonly d1: true }
  export interface KVNamespace { readonly kv: true }
  export interface Hyperdrive { readonly hyperdrive: true }
}
`;

const WORKER_BINDING_FIXTURES = {
  D1: {
    kind: CONNECTION_POINT_KINDS.WORKER_BINDING,
    workspace: WORKER_WORKSPACE,
    binding: WORKER_BINDING_NAMES.DB,
    type: WORKER_BINDING_TYPES.D1_DATABASE,
    token: { name: 'D1_DATABASE_TOKEN', from: TOKENS_MODULE },
    entry: { database_name: 'startername', database_id: 'local' },
  },
  KV: {
    kind: CONNECTION_POINT_KINDS.WORKER_BINDING,
    workspace: WORKER_WORKSPACE,
    binding: WORKER_BINDING_NAMES.KV,
    type: WORKER_BINDING_TYPES.KV_NAMESPACE,
    token: { name: 'KV_NAMESPACE_TOKEN', from: TOKENS_MODULE },
    entry: { id: 'local' },
  },
  HYPERDRIVE: {
    kind: CONNECTION_POINT_KINDS.WORKER_BINDING,
    workspace: WORKER_WORKSPACE,
    binding: WORKER_BINDING_NAMES.HYPERDRIVE,
    type: WORKER_BINDING_TYPES.HYPERDRIVE,
    token: { name: 'HYPERDRIVE_TOKEN', from: TOKENS_MODULE },
    entry: { id: 'local', localConnectionString: 'postgresql://localhost:5432/startername' },
  },
} satisfies Record<string, iConnectionPointContributionInput>;

const TOKENS_SOURCE = `import type { InjectionToken } from 'tsyringe';

export const D1_DATABASE_TOKEN: InjectionToken<unknown> = Symbol('D1_DATABASE_TOKEN');
export const KV_NAMESPACE_TOKEN: InjectionToken<unknown> = Symbol('KV_NAMESPACE_TOKEN');
export const HYPERDRIVE_TOKEN: InjectionToken<unknown> = Symbol('HYPERDRIVE_TOKEN');
`;

const BINDING_COMBINATIONS = [
  { name: 'no bindings', contributions: [] },
  { name: 'D1 only', contributions: [WORKER_BINDING_FIXTURES.D1] },
  { name: 'KV only', contributions: [WORKER_BINDING_FIXTURES.KV] },
  { name: 'Hyperdrive only', contributions: [WORKER_BINDING_FIXTURES.HYPERDRIVE] },
  {
    name: 'D1, KV and Hyperdrive',
    contributions: [WORKER_BINDING_FIXTURES.D1, WORKER_BINDING_FIXTURES.KV, WORKER_BINDING_FIXTURES.HYPERDRIVE],
  },
];

const generator = createGeneratorContainer({ sourceRoot: REPOSITORY_ROOT, manifests: [] }).resolve(
  ConnectionPointGenerator,
);

async function renderWorkerBindings(contributions: iConnectionPointContributionInput[]) {
  const manifest = moduleManifestSchema.parse(
    createManifest(testModuleId('alpha'), {
      contributions,
      hosts: [{ kind: CONNECTION_POINT_KINDS.WORKER_BINDING, workspace: WORKER_WORKSPACE }],
    }),
  );
  const result = await generator.generate([manifest], { installedModules: [manifest.id], projectName: 'acme' });
  const file = result.files.find((candidate) => candidate.path === BINDINGS_FILE);
  if (!file) throw new Error(`${BINDINGS_FILE} was not generated`);
  return file.content;
}

/** Compiles the files together under strict settings and returns what the compiler reports. */
function compileDiagnostics(rootNames: string[]) {
  const program = ts.createProgram({
    rootNames,
    options: {
      noEmit: true,
      strict: true,
      skipLibCheck: true,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      experimentalDecorators: true,
      types: [],
    },
  });
  return ts.getPreEmitDiagnostics(program).map((diagnostic) => ({
    file: diagnostic.file ? path.basename(diagnostic.file.fileName) : null,
    message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
  }));
}

describe('generated worker-bindings.ts', () => {
  let projectDirectory: string;

  beforeEach(async () => {
    // Inside this package so `tsyringe` resolves from its node_modules.
    const parentDirectory = path.join(REPOSITORY_ROOT, 'packages/create-tsukuri/node_modules/.cache');
    await mkdir(parentDirectory, { recursive: true });
    projectDirectory = await mkdtemp(path.join(parentDirectory, 'worker-bindings-'));
  });

  afterEach(async () => {
    await rm(projectDirectory, { recursive: true, force: true });
  });

  it.each(BINDING_COMBINATIONS)(
    'compiles with $name',
    async ({ contributions }) => {
      const bindingsPath = path.join(projectDirectory, 'worker-bindings.ts');
      const tokensPath = path.join(projectDirectory, 'tokens.ts');
      const stubPath = path.join(projectDirectory, 'workers-types.d.ts');
      await writeFile(bindingsPath, await renderWorkerBindings(contributions));
      await writeFile(tokensPath, TOKENS_SOURCE);
      await writeFile(stubPath, WORKERS_TYPES_STUB);

      expect(compileDiagnostics([bindingsPath, tokensPath, stubPath])).toEqual([]);
    },
    COMPILE_TIMEOUT_MS,
  );

  it('declares the bindings of a Worker without any as a type that is not an empty interface', async () => {
    const content = await renderWorkerBindings([]);

    expect(content).not.toMatch(/interface\s+iWorkerBindings\s*\{\s*\}/);
    expect(content).toContain('export type iWorkerBindings = Record<never, never>;');
  });
});
