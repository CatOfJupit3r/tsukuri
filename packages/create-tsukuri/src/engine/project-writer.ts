import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { injectable } from 'tsyringe';

import { GENERATOR_ERROR_CODES } from '#~/enums/generator-error-codes.enums';

import { GeneratorError } from './generator-error';
import type { VirtualProject } from './virtual-project';

async function listDirectory(directory: string) {
  try {
    return await readdir(directory);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

@injectable()
export class ProjectWriter {
  /**
   * Writes the project into `targetDir`, which must be missing or empty. When anything fails,
   * everything written so far is removed again.
   */
  public async writeNew(targetDir: string, project: VirtualProject) {
    const existing = await listDirectory(targetDir);
    if (existing && existing.length > 0) {
      throw new GeneratorError(
        GENERATOR_ERROR_CODES.TARGET_NOT_EMPTY,
        `"${targetDir}" is not empty; refusing to overwrite it`,
      );
    }

    const isCreatedHere = existing === null;
    try {
      await mkdir(targetDir, { recursive: true });
      for (const [filePath, file] of project.entries()) {
        const absolute = path.join(targetDir, ...filePath.split('/'));
        await mkdir(path.dirname(absolute), { recursive: true });
        await writeFile(absolute, file.content);
      }
    } catch (error) {
      await this.rollback(targetDir, isCreatedHere);
      throw error;
    }
  }

  private async rollback(targetDir: string, isCreatedHere: boolean) {
    if (isCreatedHere) {
      await rm(targetDir, { recursive: true, force: true });
      return;
    }

    const entries = (await listDirectory(targetDir)) ?? [];
    await Promise.all(entries.map(async (entry) => rm(path.join(targetDir, entry), { recursive: true, force: true })));
  }
}
