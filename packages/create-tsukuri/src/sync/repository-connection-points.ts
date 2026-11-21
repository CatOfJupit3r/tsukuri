import { readdir, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { injectable } from 'tsyringe';

import { ENV_EXAMPLE_FILE } from '#~/engine/connection-points/connection-point.constants';
import { GENERATED_SOURCE_DIR } from '#~/engine/connection-points/generated-header';
import { ModuleResolver } from '#~/engine/module-resolver';
import { ProjectGenerator } from '#~/engine/project-generator';
import { FILE_KINDS } from '#~/enums/file-kinds.enums';
import { ProjectRecordStore } from '#~/record/project-record-store';
import type { iProjectRecord } from '#~/record/project-record.schema';

import type { iRepositoryVariantCheck } from './repository-variant-checks.constants';
import { REPOSITORY_VARIANT_CHECKS } from './repository-variant-checks.constants';

export interface iRepositoryConnectionPointsPlan {
  /** Connection points whose content differs from the repository, relative to its root. */
  writes: { path: string; content: Buffer }[];
  /** Generated sources no installed module produces any more. */
  deletions: string[];
}

interface iExpectedFile {
  path: string;
  content: Buffer;
}

const WORKSPACE_ROOTS = ['apps', 'packages', 'configs'];
const GENERATED_SOURCE_SEGMENT = `/${GENERATED_SOURCE_DIR}/`;

/**
 * This repository is itself a project of the modules it ships: its `starter.json` lists them, and the
 * connection points module files import (generated sources and the root `.env.example`) are generated
 * from it exactly as in a created project. Each variant folder also holds the generated sources of a project
 * that installs it, which its files are checked against.
 */
@injectable()
export class RepositoryConnectionPoints {
  constructor(
    private readonly recordStore: ProjectRecordStore,
    private readonly generator: ProjectGenerator,
    private readonly resolver: ModuleResolver,
  ) {}

  public async plan(repositoryRoot: string): Promise<iRepositoryConnectionPointsPlan> {
    const record = await this.recordStore.read(repositoryRoot);
    const expected = [
      ...(await this.repositoryFiles(record)),
      ...(await Promise.all(REPOSITORY_VARIANT_CHECKS.map(async (check) => this.variantFiles(record, check)))).flat(),
    ];

    const writes: iRepositoryConnectionPointsPlan['writes'] = [];
    for (const file of expected) {
      const current = await readFile(path.join(repositoryRoot, file.path)).catch(() => null);
      if (!current?.equals(file.content)) writes.push(file);
    }

    const expectedPaths = new Set(expected.map((file) => file.path));
    const deletions = (await this.listGeneratedSources(repositoryRoot)).filter(
      (filePath) => !expectedPaths.has(filePath),
    );

    return { writes, deletions };
  }

  public async apply(repositoryRoot: string, plan: iRepositoryConnectionPointsPlan) {
    for (const file of plan.writes) {
      const absolute = path.join(repositoryRoot, file.path);
      await mkdir(path.dirname(absolute), { recursive: true });
      await writeFile(absolute, file.content);
    }
    for (const filePath of plan.deletions) await rm(path.join(repositoryRoot, filePath), { force: true });
  }

  private async repositoryFiles(record: iProjectRecord) {
    const files = await this.connectionPointsOf(record);
    return files.filter((file) => file.path.includes(GENERATED_SOURCE_SEGMENT) || file.path === ENV_EXAMPLE_FILE);
  }

  /** The generated sources `check.workspace` gets in a project of `check.modules`, moved into its folder. */
  private async variantFiles(record: iProjectRecord, check: iRepositoryVariantCheck) {
    const { modules } = this.resolver.resolve(check.modules);
    const files = await this.connectionPointsOf({
      ...record,
      modules: modules.map((manifest) => ({ id: manifest.id, version: manifest.version, options: {} })),
    });
    const generatedDir = path.posix.join(check.workspace, GENERATED_SOURCE_DIR);
    return files
      .filter((file) => file.path.startsWith(`${generatedDir}/`))
      .map((file) => ({
        ...file,
        path: path.posix.join(check.directory, path.posix.relative(check.workspace, file.path)),
      }));
  }

  private async connectionPointsOf(record: iProjectRecord): Promise<iExpectedFile[]> {
    const project = await this.generator.compose(record);
    return project
      .entries()
      .filter(([, file]) => file.kind === FILE_KINDS.CONNECTION_POINT)
      .map(([filePath, file]) => ({ path: filePath, content: file.content }));
  }

  private async listGeneratedSources(repositoryRoot: string) {
    const workspaceDirectories = [
      ...(
        await Promise.all(
          WORKSPACE_ROOTS.map(async (workspaceRoot) =>
            (await readdir(path.join(repositoryRoot, workspaceRoot)).catch(() => [])).map((workspace) =>
              path.posix.join(workspaceRoot, workspace),
            ),
          ),
        )
      ).flat(),
      ...REPOSITORY_VARIANT_CHECKS.map((check) => check.directory),
    ];

    const files: string[] = [];
    for (const workspaceDirectory of workspaceDirectories) {
      files.push(...(await this.listFiles(repositoryRoot, path.posix.join(workspaceDirectory, GENERATED_SOURCE_DIR))));
    }
    return files.toSorted();
  }

  private async listFiles(repositoryRoot: string, directory: string) {
    const entries = await readdir(path.join(repositoryRoot, directory), { recursive: true, withFileTypes: true }).catch(
      () => [],
    );
    return entries
      .filter((entry) => entry.isFile())
      .map((entry) =>
        path.posix.join(
          directory,
          path
            .relative(path.join(repositoryRoot, directory), path.join(entry.parentPath, entry.name))
            .split(path.sep)
            .join('/'),
        ),
      );
  }
}
