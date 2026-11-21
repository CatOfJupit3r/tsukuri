import path from 'node:path';
import { pathToFileURL } from 'node:url';
import z from 'zod';

import { createGeneratorContainer } from '#~/di/container';
import { ModuleSourceReader } from '#~/engine/module-source-reader';
import { CONNECTION_POINT_KINDS } from '#~/enums/connection-point-kinds.enums';
import type { ModuleId } from '#~/enums/module-ids.enums';
import type { iEnvShapeContribution, iEnvVariableContribution } from '#~/manifest/connection-point.schema';
import { moduleManifestSchema } from '#~/manifest/module-manifest.schema';
import { MODULE_MANIFESTS } from '#~/modules/module-manifests';

import { REPOSITORY_ROOT } from '../helpers/temp-dir';

const WORKSPACE_IMPORT_PREFIX = '#~/';
const packageNameFieldsSchema = z.object({ name: z.string() });

const manifests = MODULE_MANIFESTS.map((input) => moduleManifestSchema.parse(input));
const reader = createGeneratorContainer({ sourceRoot: REPOSITORY_ROOT }).resolve(ModuleSourceReader);

/** Workspace of every package a module names, so `@scope/package/path` imports can be followed. */
const workspaceByPackageName = new Map(
  manifests.flatMap((manifest) =>
    manifest.packageJson.flatMap(({ workspace, fields }) => {
      const parsed = packageNameFieldsSchema.safeParse(fields);
      return parsed.success ? [[parsed.data.name, workspace] as const] : [];
    }),
  ),
);

const manifestsById = new Map(manifests.map((manifest) => [manifest.id, manifest]));

/** The module and every module it needs installed beside it: its requirements and its glue targets. */
function withDependencies(moduleId: ModuleId, seen = new Set<ModuleId>()) {
  if (seen.has(moduleId)) return seen;
  seen.add(moduleId);
  const manifest = manifestsById.get(moduleId);
  for (const dependency of [...(manifest?.requires ?? []), ...(manifest?.autoInclude?.modules ?? [])]) {
    withDependencies(dependency, seen);
  }
  return seen;
}

/** Repository source of every file the module and its dependencies write, by its path in a generated project. */
async function listSourcesByTarget(moduleId: ModuleId) {
  const entries = [...withDependencies(moduleId)].flatMap((id) => manifestsById.get(id)?.files ?? []);
  const files = (await Promise.all(entries.map((entry) => reader.listEntry(entry)))).flat();
  return new Map(files.map((file) => [file.targetPath, file.sourcePath]));
}

/** Where an env shape's import lands in a generated project; packages export `./*` from `src`. */
function targetPathOf({ workspace, shape }: iEnvShapeContribution) {
  if (shape.from.startsWith(WORKSPACE_IMPORT_PREFIX)) {
    return `${workspace}/src/${shape.from.slice(WORKSPACE_IMPORT_PREFIX.length)}.ts`;
  }
  const packageName = [...workspaceByPackageName.keys()].find((name) => shape.from.startsWith(`${name}/`));
  if (!packageName) throw new Error(`Cannot follow env shape import "${shape.from}"`);
  return `${workspaceByPackageName.get(packageName)}/src/${shape.from.slice(packageName.length + 1)}.ts`;
}

async function loadShapeKeys(contribution: iEnvShapeContribution, sourcesByTarget: Map<string, string>) {
  const targetPath = targetPathOf(contribution);
  const sourcePath = sourcesByTarget.get(targetPath);
  if (!sourcePath) throw new Error(`Neither the module nor its dependencies write ${targetPath}`);
  const exports: unknown = await import(pathToFileURL(path.join(REPOSITORY_ROOT, sourcePath)).href);
  const shape: unknown = typeof exports === 'object' && exports ? Reflect.get(exports, contribution.shape.name) : null;
  if (typeof shape !== 'object' || !shape) throw new Error(`${sourcePath} does not export ${contribution.shape.name}`);
  return Object.keys(shape);
}

const cases = manifests.flatMap((manifest) => {
  const variables = manifest.contributions.filter(
    (contribution): contribution is iEnvVariableContribution =>
      contribution.kind === CONNECTION_POINT_KINDS.ENV_VARIABLE,
  );
  const shapes = manifest.contributions.filter(
    (contribution): contribution is iEnvShapeContribution => contribution.kind === CONNECTION_POINT_KINDS.ENV_SHAPE,
  );
  const workspaces = new Set([...variables, ...shapes].map((contribution) => contribution.workspace));

  return [...workspaces].map((workspace) => ({
    moduleId: manifest.id,
    workspace,
    variables: variables.filter((variable) => variable.workspace === workspace).map((variable) => variable.name),
    shapes: shapes.filter((shape) => shape.workspace === workspace),
  }));
});

/**
 * `.env.example` lists the variables a manifest declares, and the generated env schema validates the keys
 * of the shapes it imports, so each module's two lists must be the same, and the module (or one it needs)
 * must ship the file each shape is imported from.
 */
describe('module env shapes', () => {
  it.each(cases)('$moduleId validates exactly the variables it declares in $workspace', async (testCase) => {
    const sourcesByTarget = await listSourcesByTarget(testCase.moduleId);
    const keys = (await Promise.all(testCase.shapes.map((shape) => loadShapeKeys(shape, sourcesByTarget)))).flat();

    expect(keys.toSorted()).toEqual(testCase.variables.toSorted());
  });
});

async function loadEnvSchema(sourcePath: string, shapeName: string) {
  const exports: unknown = await import(pathToFileURL(path.join(REPOSITORY_ROOT, sourcePath)).href);
  const shape: unknown = typeof exports === 'object' && exports ? Reflect.get(exports, shapeName) : null;
  const parsedShape = z
    .record(
      z.string(),
      z.custom<z.ZodType>((value) => value instanceof z.ZodType),
    )
    .safeParse(shape);
  if (!parsedShape.success) throw new Error(`${sourcePath} does not export ${shapeName}`);
  return z.object(parsedShape.data);
}

describe('module env shape values', () => {
  it('better-auth splits the trusted origins list into trimmed origins and treats empty as none', async () => {
    const schema = await loadEnvSchema('packages/api/src/features/auth/better-auth.env.ts', 'betterAuthEnvShape');
    const required = { BETTER_AUTH_SECRET: 'x'.repeat(32), BETTER_AUTH_URL: 'http://localhost:5050' };

    expect(
      schema.parse({ ...required, AUTH_TRUSTED_ORIGINS: ' http://a.test , ,http://b.test' }).AUTH_TRUSTED_ORIGINS,
    ).toEqual(['http://a.test', 'http://b.test']);
    expect(schema.parse(required).AUTH_TRUSTED_ORIGINS).toEqual([]);
    expect(schema.safeParse({ ...required, BETTER_AUTH_SECRET: 'short' }).success).toBe(false);
  });

  it('node-hono coerces the server port and rejects ports outside 1-65535', async () => {
    const schema = await loadEnvSchema('apps/server/src/constants/node-hono.env.ts', 'nodeHonoEnvShape');

    expect(schema.parse({ SERVER_PORT: '8080' }).SERVER_PORT).toBe(8080);
    expect(schema.parse({}).SERVER_PORT).toBe(5050);
    expect(schema.safeParse({ SERVER_PORT: '0' }).success).toBe(false);
    expect(schema.safeParse({ SERVER_PORT: '65536' }).success).toBe(false);
    expect(schema.safeParse({ SERVER_PORT: '80.5' }).success).toBe(false);
  });

  it('valkey coerces the database index to an integer', async () => {
    const schema = await loadEnvSchema('packages/api/src/features/valkey/valkey.env.ts', 'valkeyEnvShape');

    expect(schema.parse({ VALKEY_DB: '3' }).VALKEY_DB).toBe(3);
    expect(schema.parse({}).VALKEY_DB).toBe(0);
    expect(schema.safeParse({ VALKEY_DB: '1.5' }).success).toBe(false);
  });
});
