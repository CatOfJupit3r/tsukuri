import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { injectable } from 'tsyringe';

import { skillPath } from '#~/constants/skill-path';
import { TEMPLATES_DIR } from '#~/constants/template-path';
import { BundledFileNames } from '#~/engine/bundled-file-names';
import { ModuleRegistry } from '#~/engine/module-registry';
import { ModuleSourceReader } from '#~/engine/module-source-reader';
import type { iModuleFileEntry } from '#~/manifest/module-manifest.schema';

/**
 * Copies every file the generator can read (module files, markdown fragments, skills and the
 * templates) into one folder, keeping the repository layout, so that folder can stand in as the
 * source root of the published package. Files npm would drop when packing are stored escaped.
 */
@injectable()
export class ModuleSourceBundler {
  constructor(
    private readonly registry: ModuleRegistry,
    private readonly reader: ModuleSourceReader,
    private readonly bundledFileNames: BundledFileNames,
  ) {}

  /** Source paths relative to the source root, sorted and without duplicates. */
  public async listSources() {
    const files = await Promise.all(this.listEntries().map(async (entry) => this.reader.listEntry(entry)));
    return [...new Set(files.flat().map((file) => file.sourcePath))].toSorted();
  }

  /** Replaces `outputDirectory` with a copy of every source and returns the copied paths. */
  public async bundle(outputDirectory: string) {
    const sourcePaths = await this.listSources();
    await rm(outputDirectory, { recursive: true, force: true });

    for (const sourcePath of sourcePaths) {
      const targetPath = path.join(outputDirectory, ...this.bundledFileNames.escape(sourcePath).split('/'));
      await mkdir(path.dirname(targetPath), { recursive: true });
      await writeFile(targetPath, await this.reader.read(sourcePath));
    }

    return sourcePaths;
  }

  private listEntries(): iModuleFileEntry[] {
    const manifests = this.registry.list();
    const skillIds = new Set(manifests.flatMap((manifest) => manifest.skills));

    return [
      { source: TEMPLATES_DIR, exclude: [] },
      ...manifests.flatMap((manifest) => manifest.files),
      ...manifests.flatMap((manifest) =>
        manifest.markdown.map((fragment) => ({ source: fragment.source, exclude: [] })),
      ),
      ...[...skillIds].map((skillId) => ({ source: skillPath(skillId), exclude: [] })),
    ];
  }
}
