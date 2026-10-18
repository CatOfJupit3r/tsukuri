import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { inject, injectable } from 'tsyringe';

import { SOURCE_LAYOUT_TOKEN, SOURCE_ROOT_TOKEN } from '@~/di/tokens';
import { GENERATOR_ERROR_CODES } from '@~/enums/generator-error-codes.enums';
import type { SourceLayout } from '@~/enums/source-layouts.enums';
import { SOURCE_LAYOUTS } from '@~/enums/source-layouts.enums';
import type { iModuleFileEntry } from '@~/manifest/module-manifest.schema';

import { BundledFileNames } from './bundled-file-names';
import { GeneratorError } from './generator-error';

export interface iSourceFile {
  /** Path relative to the source root, with forward slashes. */
  sourcePath: string;
  /** Path relative to the generated project root, with forward slashes. */
  targetPath: string;
}

/** Build output, caches and local secrets never belong to a module. */
const IGNORED_SEGMENTS = new Set(['node_modules', 'dist', '.turbo', '.vitest', 'coverage', '.DS_Store', '.env']);
const IGNORED_SUFFIXES = ['.tsbuildinfo', '.log'];

/** Composed from manifest contributions instead of being copied. */
export const COMPOSED_FILE_NAME = 'package.json';

function toPosix(value: string) {
  return value.split(path.sep).join('/');
}

function isIgnored(relativePath: string) {
  const segments = relativePath.split('/');
  return (
    segments.some((segment) => IGNORED_SEGMENTS.has(segment)) ||
    IGNORED_SUFFIXES.some((suffix) => relativePath.endsWith(suffix))
  );
}

function isExcluded(relativePath: string, exclude: string[]) {
  return exclude.some((pattern) => relativePath === pattern || relativePath.startsWith(`${pattern}/`));
}

@injectable()
export class ModuleSourceReader {
  constructor(
    @inject(SOURCE_ROOT_TOKEN) private readonly sourceRoot: string,
    @inject(SOURCE_LAYOUT_TOKEN) private readonly sourceLayout: SourceLayout,
    private readonly bundledFileNames: BundledFileNames,
  ) {}

  /** Lists the files of a manifest file entry, mapped to their target paths. */
  public async listEntry(entry: iModuleFileEntry): Promise<iSourceFile[]> {
    const absolute = this.resolve(entry.source);
    const stats = await stat(absolute).catch(() => null);
    if (!stats) {
      throw new GeneratorError(
        GENERATOR_ERROR_CODES.SOURCE_NOT_FOUND,
        `Module source "${entry.source}" does not exist`,
      );
    }

    const target = entry.target ?? entry.source;
    if (stats.isFile()) return [{ sourcePath: entry.source, targetPath: target }];

    const entries = await readdir(absolute, { recursive: true, withFileTypes: true });
    return entries
      .filter((dirent) => dirent.isFile())
      .map((dirent) => this.toSourcePath(toPosix(path.relative(absolute, path.join(dirent.parentPath, dirent.name)))))
      .filter((relative) => !isIgnored(relative) && !isExcluded(relative, entry.exclude))
      .toSorted()
      .map((relative) => ({
        sourcePath: `${entry.source}/${relative}`,
        targetPath: `${target}/${relative}`,
      }));
  }

  public async read(sourcePath: string) {
    return readFile(this.resolve(sourcePath));
  }

  public async readText(sourcePath: string) {
    const absolute = this.resolve(sourcePath);
    return readFile(absolute, 'utf8').catch(() => {
      throw new GeneratorError(GENERATOR_ERROR_CODES.SOURCE_NOT_FOUND, `Module source "${sourcePath}" does not exist`);
    });
  }

  private resolve(sourcePath: string) {
    const storedPath =
      this.sourceLayout === SOURCE_LAYOUTS.BUNDLE ? this.bundledFileNames.escape(sourcePath) : sourcePath;
    return path.join(this.sourceRoot, ...storedPath.split('/'));
  }

  /** Repository path of a file as it is stored under the source root. */
  private toSourcePath(storedPath: string) {
    return this.sourceLayout === SOURCE_LAYOUTS.BUNDLE ? this.bundledFileNames.unescape(storedPath) : storedPath;
  }
}
