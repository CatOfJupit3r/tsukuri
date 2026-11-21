import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { promisify } from 'node:util';
import ts from 'typescript';

import { createGeneratorContainer } from '#~/di/container';
import { ConnectionPointGenerator } from '#~/engine/connection-points/connection-point-generator';
import { moduleManifestSchema } from '#~/manifest/module-manifest.schema';
import { cloudflareKvModule, d1Module } from '#~/modules/cloudflare-storage.module';
import { cloudflareWorkerModule, WORKER_WORKSPACE } from '#~/modules/cloudflare-worker.module';
import { postgresHyperdriveModule } from '#~/modules/postgres-runtimes.module';

import { REPOSITORY_ROOT } from '../helpers/temp-dir';

const BINDINGS_FILE = `${WORKER_WORKSPACE}/src/generated/worker-bindings.ts`;
const COMPILE_TIMEOUT_MS = 60_000;
const ESLINT_BINARY = path.join(
  path.dirname(createRequire(import.meta.url).resolve('eslint/package.json')),
  'bin/eslint.js',
);
const runProcess = promisify(execFile);
const API_SOURCE_ROOTS = ['src', 'variants/d1/src', 'variants/postgres-hyperdrive/src'].map((root) =>
  path.join(REPOSITORY_ROOT, 'packages/api', root, '*'),
);

/** The Worker types the rendered file imports, reduced to what it needs to compile. */
const WORKERS_TYPES_STUB = `declare module '@cloudflare/workers-types' {
  export interface D1Database { readonly d1: true }
  export interface KVNamespace { readonly kv: true }
  export interface Hyperdrive { readonly hyperdrive: true }
}
`;

const BINDING_COMBINATIONS = [
  { name: 'no bindings', bindingModules: [] },
  { name: 'D1 only', bindingModules: [d1Module] },
  { name: 'KV only', bindingModules: [cloudflareKvModule] },
  { name: 'Hyperdrive only', bindingModules: [postgresHyperdriveModule] },
  { name: 'D1, KV and Hyperdrive', bindingModules: [d1Module, cloudflareKvModule, postgresHyperdriveModule] },
];

const generator = createGeneratorContainer({ sourceRoot: REPOSITORY_ROOT, manifests: [] }).resolve(
  ConnectionPointGenerator,
);

/** Renders the file from the real module manifests, the way a project with those modules gets it. */
async function renderWorkerBindings(bindingModules: (typeof d1Module)[]) {
  const manifests = [cloudflareWorkerModule, ...bindingModules].map((module) => moduleManifestSchema.parse(module));
  const result = await generator.generate(manifests, {
    installedModules: manifests.map((manifest) => manifest.id),
    projectName: 'acme',
  });
  const file = result.files.find((candidate) => candidate.path === BINDINGS_FILE);
  if (!file) throw new Error(`${BINDINGS_FILE} was not generated`);
  return file.content;
}

/** Compiles the file against the real token sources under strict settings and returns what the compiler reports. */
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
      paths: { '@startername/api/*': API_SOURCE_ROOTS },
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
    // Inside this package so `tsyringe` and the lint config resolve from its node_modules.
    const parentDirectory = path.join(REPOSITORY_ROOT, 'packages/create-tsukuri/node_modules/.cache');
    await mkdir(parentDirectory, { recursive: true });
    projectDirectory = await mkdtemp(path.join(parentDirectory, 'worker-bindings-'));
  });

  afterEach(async () => {
    await rm(projectDirectory, { recursive: true, force: true });
  });

  it.each(BINDING_COMBINATIONS)(
    'compiles with $name',
    async ({ bindingModules }) => {
      const bindingsPath = path.join(projectDirectory, 'worker-bindings.ts');
      const stubPath = path.join(projectDirectory, 'workers-types.d.ts');
      await writeFile(bindingsPath, await renderWorkerBindings(bindingModules));
      await writeFile(stubPath, WORKERS_TYPES_STUB);

      expect(compileDiagnostics([bindingsPath, stubPath])).toEqual([]);
    },
    COMPILE_TIMEOUT_MS,
  );

  it.each(BINDING_COMBINATIONS)(
    'passes the repository lint with $name',
    async ({ bindingModules }) => {
      await writeFile(path.join(projectDirectory, 'worker-bindings.ts'), await renderWorkerBindings(bindingModules));
      await writeFile(path.join(projectDirectory, '.gitignore'), '');
      await writeFile(
        path.join(projectDirectory, 'package.json'),
        JSON.stringify({
          name: 'worker-bindings-lint',
          private: true,
          type: 'module',
          dependencies: { '@cloudflare/workers-types': '*', '@startername/api': '*', tsyringe: '*' },
        }),
      );
      await writeFile(
        path.join(projectDirectory, 'tsconfig.json'),
        JSON.stringify({
          extends: path.join(REPOSITORY_ROOT, 'packages/create-tsukuri/tsconfig.json'),
          include: ['worker-bindings.ts'],
        }),
      );
      await writeFile(
        path.join(projectDirectory, 'eslint.config.mjs'),
        "import { createBackendConfig } from '@startername/lint-config/eslint';\n\nexport default createBackendConfig({ rootDir: import.meta.url });\n",
      );

      // The CLI, not the API: the lint config resolves `packageDir` against the process working directory.
      const lint = await runProcess(process.execPath, [ESLINT_BINARY, 'worker-bindings.ts'], {
        cwd: projectDirectory,
      }).catch((error: { stdout: string; stderr: string }) => error);

      expect(lint).not.toHaveProperty('code');
    },
    COMPILE_TIMEOUT_MS,
  );

  it('declares the bindings of a Worker without any as a type that is not an empty interface', async () => {
    const content = await renderWorkerBindings([]);

    expect(content).not.toMatch(/interface\s+iWorkerBindings\s*\{\s*\}/);
    expect(content).toContain('export type iWorkerBindings = Record<never, never>;');
  });
});
