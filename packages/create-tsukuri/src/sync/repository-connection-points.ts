import { readdir, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { injectable } from 'tsyringe';

import { ENV_EXAMPLE_FILE } from '#~/engine/connection-points/connection-point.constants';
import { GENERATED_SOURCE_DIR } from '#~/engine/connection-points/generated-header';
import { ProjectGenerator } from '#~/engine/project-generator';
import { FILE_KINDS } from '#~/enums/file-kinds.enums';
import { ProjectRecordStore } from '#~/record/project-record-store';

export interface iRepositoryConnectionPointsPlan {
  /** Connection points whose content differs from the repository, relative to its root. */
  writes: { path: string; content: Buffer }[];
  /** Generated sources no installed module produces any more. */
  deletions: string[];
}

const WORKSPACE_ROOTS = ['apps', 'packages', 'configs'];
const GENERATED_SOURCE_SEGMENT = `/${GENERATED_SOURCE_DIR}/`;

/**
 * This repository is itself a project of the modules it ships: its `starter.json` lists them, and the
 * connection points module files import (generated sources and the root `.env.example`) are generated
 * from it exactly as in a created project.
 */
@injectable()
export class RepositoryConnectionPoints {
  constructor(
    private readonly recordStore: ProjectRecordStore,
    private readonly generator: ProjectGenerator,
  ) {}

  public async plan(repositoryRoot: string): Promise<iRepositoryConnectionPointsPlan> {
    const project = await this.generator.compose(await this.recordStore.read(repositoryRoot));
    const expected = project
      .entries()
      .filter(([filePath, file]) => file.kind === FILE_KINDS.CONNECTION_POINT && this.isSyncedPath(filePath));

    const writes: iRepositoryConnectionPointsPlan['writes'] = [];
    for (const [filePath, file] of expected) {
      const current = await readFile(path.join(repositoryRoot, filePath)).catch(() => null);
      if (!current?.equals(file.content)) writes.push({ path: filePath, content: file.content });
    }

    const expectedPaths = new Set(expected.map(([filePath]) => filePath));
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

  private isSyncedPath(filePath: string) {
    return filePath.includes(GENERATED_SOURCE_SEGMENT) || filePath === ENV_EXAMPLE_FILE;
  }

  private async listGeneratedSources(repositoryRoot: string) {
    const files: string[] = [];
    for (const workspaceRoot of WORKSPACE_ROOTS) {
      const workspaces = await readdir(path.join(repositoryRoot, workspaceRoot)).catch(() => []);
      for (const workspace of workspaces) {
        const generatedDir = path.posix.join(workspaceRoot, workspace, GENERATED_SOURCE_DIR);
        const entries = await readdir(path.join(repositoryRoot, generatedDir), {
          recursive: true,
          withFileTypes: true,
        }).catch(() => []);
        files.push(
          ...entries
            .filter((entry) => entry.isFile())
            .map((entry) =>
              path.posix.join(
                generatedDir,
                path
                  .relative(path.join(repositoryRoot, generatedDir), path.join(entry.parentPath, entry.name))
                  .split(path.sep)
                  .join('/'),
              ),
            ),
        );
      }
    }
    return files.toSorted();
  }
}
