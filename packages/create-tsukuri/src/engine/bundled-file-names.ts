import path from 'node:path';
import { injectable } from 'tsyringe';

import { PACK_ESCAPE_PREFIX, PACK_RESERVED_FILE_NAMES } from '@~/constants/bundled-sources';

const DOT_PREFIX = '.';

/** Maps repository paths to the names the published bundle stores them under, and back. */
@injectable()
export class BundledFileNames {
  /** `configs/.gitignore` -> `configs/_gitignore` */
  public escape(sourcePath: string) {
    const fileName = path.posix.basename(sourcePath);
    if (!PACK_RESERVED_FILE_NAMES.includes(fileName)) return sourcePath;
    return this.replaceFileName(sourcePath, `${PACK_ESCAPE_PREFIX}${fileName.slice(DOT_PREFIX.length)}`);
  }

  /** `configs/_gitignore` -> `configs/.gitignore` */
  public unescape(storedPath: string) {
    const fileName = path.posix.basename(storedPath);
    const originalName = `${DOT_PREFIX}${fileName.slice(PACK_ESCAPE_PREFIX.length)}`;
    const isEscaped = fileName.startsWith(PACK_ESCAPE_PREFIX) && PACK_RESERVED_FILE_NAMES.includes(originalName);
    return isEscaped ? this.replaceFileName(storedPath, originalName) : storedPath;
  }

  private replaceFileName(filePath: string, fileName: string) {
    const directory = path.posix.dirname(filePath);
    return directory === DOT_PREFIX ? fileName : `${directory}/${fileName}`;
  }
}
