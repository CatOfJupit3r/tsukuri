import type { FileKind } from '#~/enums/file-kinds.enums';
import { GENERATOR_ERROR_CODES } from '#~/enums/generator-error-codes.enums';
import type { ModuleId } from '#~/enums/module-ids.enums';

import { GeneratorError } from './generator-error';

export interface iFileOrigin {
  kind: FileKind;
  /** Module that ships the file, for module files and skills. */
  moduleId?: ModuleId;
}

export interface iVirtualFile extends iFileOrigin {
  content: Buffer;
}

function describe(origin: iFileOrigin) {
  return origin.moduleId ?? origin.kind;
}

/** In-memory project tree keyed by POSIX path relative to the project root. */
export class VirtualProject {
  private readonly files = new Map<string, iVirtualFile>();

  public write(filePath: string, content: Buffer | string, origin: iFileOrigin) {
    const buffer = typeof content === 'string' ? Buffer.from(content, 'utf8') : content;
    const existing = this.files.get(filePath);

    if (existing && !existing.content.equals(buffer)) {
      throw new GeneratorError(
        GENERATOR_ERROR_CODES.FILE_CONFLICT,
        `"${filePath}" is written by both "${describe(existing)}" and "${describe(origin)}" with different content`,
      );
    }

    this.files.set(filePath, existing ?? { ...origin, content: buffer });
  }

  public has(filePath: string) {
    return this.files.has(filePath);
  }

  public get(filePath: string) {
    return this.files.get(filePath);
  }

  public paths() {
    return [...this.files.keys()].toSorted();
  }

  public entries() {
    return [...this.files.entries()].toSorted(([left], [right]) => left.localeCompare(right));
  }
}
