import path from 'node:path';
import ts from 'typescript';

import { createGeneratorContainer } from '#~/di/container';
import { ModuleRegistry } from '#~/engine/modules/module-registry';
import { ModuleResolver } from '#~/engine/modules/module-resolver';
import { ProjectGenerator } from '#~/engine/project-generator';
import { moduleIdSchema } from '#~/enums/module-ids.enums';

import { readImportSpecifiers } from '../helpers/lint-config-import-scanner';
import { REPOSITORY_ROOT, useTempDir } from '../helpers/temp-dir';
import { readTree } from '../helpers/tree';
import { planModuleMatrix } from './module-matrix';

const SOURCE_FILE_PATTERN = /\.(?:ts|tsx|mts|cts)$/;
const WORKSPACE_SOURCE_PATTERN = /^(?:apps|packages)\/[^/]+\/(?:src|test)\//;
const INTERNAL_ALIAS_PREFIX = '#~/';
const RESOLVABLE_SUFFIXES = ['', '.ts', '.tsx', '.d.ts', '.mts', '.cts', '.json'];
const IMPORT_EXTENSION_PATTERN = /\.(?:js|jsx|mjs|cjs)$/;
const IMPORT_QUERY_PATTERN = /\?.*$/;
/** Written by the router plugin during check-types, dev and build, so no module copies it. */
const ROUTER_GENERATED_FILE_SUFFIX = 'routeTree.gen';

const GENERATOR = createGeneratorContainer({ sourceRoot: REPOSITORY_ROOT });
const REGISTRY = GENERATOR.resolve(ModuleRegistry);
const RESOLVER = GENERATOR.resolve(ModuleResolver);
const PROJECT_GENERATOR = GENERATOR.resolve(ProjectGenerator);

function findPackageRoot(filePath: string, files: ReadonlySet<string>) {
  let directory = path.posix.dirname(filePath);
  while (directory !== '.' && !files.has(`${directory}/package.json`)) directory = path.posix.dirname(directory);
  return directory;
}

function isResolvable(targetPath: string, files: ReadonlySet<string>) {
  const withoutScriptExtension = targetPath.replace(IMPORT_EXTENSION_PATTERN, '');
  return RESOLVABLE_SUFFIXES.some(
    (suffix) => files.has(`${targetPath}${suffix}`) || files.has(`${withoutScriptExtension}${suffix}`),
  );
}

function findUnresolvedImports(tree: ReadonlyMap<string, Buffer>) {
  const files = new Set(tree.keys());
  const unresolved: string[] = [];
  for (const [filePath, content] of tree) {
    if (!SOURCE_FILE_PATTERN.test(filePath) || !WORKSPACE_SOURCE_PATTERN.test(filePath)) continue;
    const sourceFile = ts.createSourceFile(filePath, content.toString('utf8'), ts.ScriptTarget.Latest);
    for (const rawSpecifier of readImportSpecifiers(sourceFile)) {
      const specifier = rawSpecifier.replace(IMPORT_QUERY_PATTERN, '');
      if (specifier.endsWith(ROUTER_GENERATED_FILE_SUFFIX)) continue;
      if (specifier.startsWith(INTERNAL_ALIAS_PREFIX)) {
        const packageRoot = findPackageRoot(filePath, files);
        const target = path.posix.join(packageRoot, 'src', specifier.slice(INTERNAL_ALIAS_PREFIX.length));
        if (!isResolvable(target, files)) unresolved.push(`${filePath} -> ${specifier}`);
      } else if (specifier.startsWith('.')) {
        const target = path.posix.join(path.posix.dirname(filePath), specifier);
        if (!isResolvable(target, files)) unresolved.push(`${filePath} -> ${specifier}`);
      }
    }
  }
  return unresolved;
}

describe('generated project import resolution', () => {
  const createTempDir = useTempDir();

  it('contains every file that a copied source file imports through #~/ or a relative path', async () => {
    const selections = planModuleMatrix(REGISTRY, RESOLVER).map(({ modules }) =>
      moduleIdSchema.array().parse(JSON.parse(modules)),
    );
    const failures: string[] = [];
    const parentDirectory = await createTempDir();

    for (const [index, modules] of selections.entries()) {
      const targetDir = path.join(parentDirectory, `project-${index}`);
      await PROJECT_GENERATOR.create({ targetDir, projectName: 'acme', modules });
      const unresolved = findUnresolvedImports(await readTree(targetDir));
      failures.push(...unresolved.map((entry) => `[${modules.join(' + ') || 'base'}] ${entry}`));
    }

    expect(failures).toEqual([]);
  }, 600_000);
});
