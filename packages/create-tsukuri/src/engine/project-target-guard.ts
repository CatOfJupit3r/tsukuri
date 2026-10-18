import path from 'node:path';
import { inject, injectable } from 'tsyringe';

import { SOURCE_ROOT_TOKEN } from '@~/di/tokens';
import { GENERATOR_ERROR_CODES } from '@~/enums/generator-error-codes.enums';

import { GeneratorError } from './generator-error';

const PARENT_DIRECTORY = '..';

/** Keeps generated projects out of the folder the module sources are read from. */
@injectable()
export class ProjectTargetGuard {
  constructor(@inject(SOURCE_ROOT_TOKEN) private readonly sourceRoot: string) {}

  /** Returns why a project cannot be created in `targetDir`, or null when it can. */
  public getTargetProblem(targetDir: string) {
    if (!this.isInsideSourceRoot(targetDir)) return null;
    return `"${targetDir}" is inside the generator sources at "${this.sourceRoot}"; create the project outside it`;
  }

  public assertTarget(targetDir: string) {
    const problem = this.getTargetProblem(targetDir);
    if (problem) throw new GeneratorError(GENERATOR_ERROR_CODES.TARGET_INSIDE_SOURCE, problem);
  }

  private isInsideSourceRoot(targetDir: string) {
    const relative = path.relative(path.resolve(this.sourceRoot), path.resolve(targetDir));
    const isOutside =
      relative === PARENT_DIRECTORY ||
      relative.startsWith(`${PARENT_DIRECTORY}${path.sep}`) ||
      path.isAbsolute(relative);
    return !isOutside;
  }
}
