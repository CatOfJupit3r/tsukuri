import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { createGeneratorContainer } from '#~/di/container';
import { ModuleSourceReader } from '#~/engine/module-source-reader';
import { CONNECTION_POINT_KINDS } from '#~/enums/connection-point-kinds.enums';
import type { iEnvShapeContribution, iEnvVariableContribution } from '#~/manifest/connection-point.schema';
import { moduleManifestSchema } from '#~/manifest/module-manifest.schema';
import { MODULE_MANIFESTS } from '#~/modules/module-manifests';

import { REPOSITORY_ROOT } from '../helpers/temp-dir';

const WORKSPACE_IMPORT_PREFIX = '#~/';

const manifests = MODULE_MANIFESTS.map((input) => moduleManifestSchema.parse(input));
const reader = createGeneratorContainer({ sourceRoot: REPOSITORY_ROOT }).resolve(ModuleSourceReader);

/** Workspace of every package a module names, so `@scope/package/path` imports can be followed. */
const workspaceByPackageName = new Map(
  manifests.flatMap((manifest) =>
    manifest.packageJson.flatMap(({ workspace, fields }) =>
      typeof fields.name === 'string' ? [[fields.name, workspace] as const] : [],
    ),
  ),
);

/** Repository source of every file a module writes, by its path in a generated project. */
async function listSourcesByTarget() {
  const entries = manifests.flatMap((manifest) => manifest.files);
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
  if (!sourcePath) throw new Error(`No module writes ${targetPath}`);
  const exports = (await import(pathToFileURL(path.join(REPOSITORY_ROOT, sourcePath)).href)) as Record<
    string,
    object | undefined
  >;
  const shape = exports[contribution.shape.name];
  if (!shape) throw new Error(`${sourcePath} does not export ${contribution.shape.name}`);
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
 * of the shapes it imports, so each module's two lists must be the same.
 */
describe('module env shapes', () => {
  let sourcesByTarget = new Map<string, string>();

  beforeAll(async () => {
    sourcesByTarget = await listSourcesByTarget();
  });

  it.each(cases)('$moduleId validates exactly the variables it declares in $workspace', async (testCase) => {
    const keys = (await Promise.all(testCase.shapes.map((shape) => loadShapeKeys(shape, sourcesByTarget)))).flat();

    expect(keys.toSorted()).toEqual(testCase.variables.toSorted());
  });
});
