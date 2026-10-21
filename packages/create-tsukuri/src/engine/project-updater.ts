import { mkdir, readdir, readFile, rm, rmdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { injectable } from 'tsyringe';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

import type { FileChangeKind } from '#~/enums/files/file-change-kinds.enums';
import { FILE_CHANGE_KINDS } from '#~/enums/files/file-change-kinds.enums';
import { FILE_KINDS } from '#~/enums/files/file-kinds.enums';
import type { FileKind } from '#~/enums/files/file-kinds.enums';
import type { iProjectRecord } from '#~/record/project-record.schema';

import { DEPENDENCY_FIELDS, PackageJsonMerger } from './merge/package-json-merger';
import type { iPackageJson } from './merge/package-json-merger';
import { mergeThreeWay } from './merge/three-way-merge';
import { ProjectGenerator } from './project-generator';
import type { iVirtualFile } from './virtual-project';

export interface iFileChange {
  path: string;
  kind: FileChangeKind;
  /** New content for CREATE, UPDATE and MERGE. */
  content?: Buffer;
  /** Why a file is a conflict, or which keys kept the local value in a merge. */
  detail?: string;
}

export interface iUpdatePlan {
  record: iProjectRecord;
  changes: iFileChange[];
}

/** Files merged key by key, so local edits (extra dependencies, scripts, globs) survive. */
const MERGED_KINDS = new Set<FileKind>([FILE_KINDS.PACKAGE_JSON, FILE_KINDS.PNPM_WORKSPACE]);
/** Files nobody edits by hand; they are always rewritten. */
const OVERWRITTEN_KINDS = new Set<FileKind>([FILE_KINDS.CONNECTION_POINT, FILE_KINDS.MODULE_RECORD]);

async function readOptional(filePath: string) {
  try {
    return await readFile(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

/** Removes directories a deletion left empty, walking up to (not including) the project root. */
async function pruneEmptyParents(filePath: string, projectDir: string) {
  for (let directory = path.dirname(filePath); directory.startsWith(`${projectDir}${path.sep}`);) {
    if ((await readdir(directory)).length > 0) return;
    await rmdir(directory);
    directory = path.dirname(directory);
  }
}

function sortDependencies(packageJson: iPackageJson) {
  const sorted: iPackageJson = { ...packageJson };
  for (const field of DEPENDENCY_FIELDS) {
    const dependencies = sorted[field];
    if (typeof dependencies !== 'object' || dependencies === null) continue;
    sorted[field] = Object.fromEntries(
      Object.entries(dependencies as Record<string, string>).toSorted(([left], [right]) => left.localeCompare(right)),
    );
  }
  return sorted;
}

/**
 * Moves an existing project from one module record to another. Both records are composed from
 * the same module sources and only the difference is applied, so files the user changed are
 * merged (package.json, pnpm-workspace.yaml) or left alone and reported as conflicts.
 */
@injectable()
export class ProjectUpdater {
  public constructor(
    private readonly generator: ProjectGenerator,
    private readonly packageJsonMerger: PackageJsonMerger,
  ) {}

  public async plan(projectDir: string, current: iProjectRecord, next: iProjectRecord): Promise<iUpdatePlan> {
    const before = await this.generator.compose(current);
    const after = await this.generator.compose(next);
    const paths = [...new Set([...before.paths(), ...after.paths()])].toSorted();
    const changes: iFileChange[] = [];

    for (const filePath of paths) {
      const change = await this.planFile(filePath, before.get(filePath), after.get(filePath), projectDir);
      if (change) changes.push(change);
    }
    return { record: next, changes };
  }

  /** Applies a plan; if anything fails, every touched file is restored. */
  public async apply(projectDir: string, plan: iUpdatePlan) {
    const originals = new Map<string, Buffer | null>();
    try {
      for (const change of plan.changes) {
        if (change.kind === FILE_CHANGE_KINDS.CONFLICT) continue;

        const absolute = path.join(projectDir, ...change.path.split('/'));
        originals.set(absolute, await readOptional(absolute));
        if (change.kind === FILE_CHANGE_KINDS.DELETE) {
          await rm(absolute, { force: true });
          await pruneEmptyParents(absolute, projectDir);
          continue;
        }
        await mkdir(path.dirname(absolute), { recursive: true });
        await writeFile(absolute, change.content ?? Buffer.alloc(0));
      }
    } catch (error) {
      for (const [absolute, original] of originals) {
        if (original === null) await rm(absolute, { force: true });
        else await writeFile(absolute, original);
      }
      throw error;
    }
  }

  private async planFile(
    filePath: string,
    before: iVirtualFile | undefined,
    after: iVirtualFile | undefined,
    projectDir: string,
  ): Promise<iFileChange | null> {
    if (before && after && before.content.equals(after.content)) return null;

    const disk = await readOptional(path.join(projectDir, ...filePath.split('/')));
    const origin = after ?? before;
    if (!origin) return null;

    if (!after) {
      if (!disk) return null;
      if (before && disk.equals(before.content)) return { path: filePath, kind: FILE_CHANGE_KINDS.DELETE };
      return { path: filePath, kind: FILE_CHANGE_KINDS.CONFLICT, detail: 'changed locally, not deleted' };
    }

    if (!disk) return { path: filePath, kind: FILE_CHANGE_KINDS.CREATE, content: after.content };
    if (disk.equals(after.content)) return null;

    const isUntouched = before !== undefined && disk.equals(before.content);
    if (isUntouched || OVERWRITTEN_KINDS.has(origin.kind)) {
      return { path: filePath, kind: FILE_CHANGE_KINDS.UPDATE, content: after.content };
    }

    if (MERGED_KINDS.has(origin.kind)) return this.planMerge(filePath, origin.kind, before, disk, after);

    return {
      path: filePath,
      kind: FILE_CHANGE_KINDS.CONFLICT,
      detail: before ? 'changed locally, left as is' : 'already exists, left as is',
    };
  }

  private planMerge(
    filePath: string,
    kind: FileKind,
    before: iVirtualFile | undefined,
    disk: Buffer,
    after: iVirtualFile,
  ): iFileChange | null {
    const isPackageJson = kind === FILE_KINDS.PACKAGE_JSON;
    const parse = (content: Buffer): unknown =>
      isPackageJson ? JSON.parse(content.toString('utf8')) : parseYaml(content.toString('utf8'));

    const merged = mergeThreeWay(before ? parse(before.content) : {}, parse(disk), parse(after.content));
    const text = isPackageJson
      ? this.packageJsonMerger.serialize(sortDependencies(merged.value as iPackageJson))
      : stringifyYaml(merged.value);
    const content = Buffer.from(text, 'utf8');
    if (content.equals(disk)) return null;

    return {
      path: filePath,
      kind: FILE_CHANGE_KINDS.MERGE,
      content,
      ...(merged.conflicts.length > 0 ? { detail: `kept local values for ${merged.conflicts.join(', ')}` } : {}),
    };
  }
}
