import { GENERATOR_ERROR_CODES } from '@~/enums/generator-error-codes.enums';

import { GeneratorError } from './generator-error';

export interface iVirtualFile {
  content: Buffer;
  /** Module id, or a description of the generator step that produced the file. */
  owner: string;
}

/** In-memory project tree keyed by POSIX path relative to the project root. */
export class VirtualProject {
  private readonly files = new Map<string, iVirtualFile>();

  public write(filePath: string, content: Buffer | string, owner: string) {
    const buffer = typeof content === 'string' ? Buffer.from(content, 'utf8') : content;
    const existing = this.files.get(filePath);

    if (existing && !existing.content.equals(buffer)) {
      throw new GeneratorError(
        GENERATOR_ERROR_CODES.FILE_CONFLICT,
        `"${filePath}" is written by both "${existing.owner}" and "${owner}" with different content`,
      );
    }

    this.files.set(filePath, { content: buffer, owner: existing?.owner ?? owner });
  }

  public has(filePath: string) {
    return this.files.has(filePath);
  }

  public get(filePath: string) {
    return this.files.get(filePath);
  }

  public paths() {
    return [...this.files.keys()].sort();
  }

  public entries() {
    return [...this.files.entries()].sort(([left], [right]) => left.localeCompare(right));
  }
}
