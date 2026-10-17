import path from 'node:path';
import { injectable } from 'tsyringe';

import { GENERATOR_ERROR_CODES } from '@~/enums/generator-error-codes.enums';
import type { iModuleManifest } from '@~/manifest/module-manifest.schema';

import { GeneratorError } from './generator-error';
import { MarkdownRenderer } from './markdown-renderer';
import { COMPOSED_FILE_NAME, ModuleSourceReader } from './module-source-reader';
import { PackageJsonMerger } from './package-json-merger';
import { PnpmWorkspaceMerger } from './pnpm-workspace-merger';
import { applyProjectName } from './project-identity';
import { VirtualProject } from './virtual-project';

export interface iComposeOptions {
  modules: iModuleManifest[];
  projectName: string;
}

const SKILLS_DIR = '.agents/skills';
const PNPM_WORKSPACE_FILE = 'pnpm-workspace.yaml';
const ROOT_WORKSPACE = '.';
/** First bytes inspected when deciding whether a file is text. */
const BINARY_SNIFF_LENGTH = 8000;

function isBinary(content: Buffer) {
  return content.subarray(0, BINARY_SNIFF_LENGTH).includes(0);
}

function workspaceFile(workspace: string, fileName: string) {
  return workspace === ROOT_WORKSPACE ? fileName : path.posix.join(workspace, fileName);
}

@injectable()
export class ProjectComposer {
  constructor(
    private readonly reader: ModuleSourceReader,
    private readonly packageJsonMerger: PackageJsonMerger,
    private readonly pnpmWorkspaceMerger: PnpmWorkspaceMerger,
    private readonly markdownRenderer: MarkdownRenderer,
  ) {}

  /** Combines the resolved modules into an in-memory project tree. */
  public async compose({ modules, projectName }: iComposeOptions) {
    const project = new VirtualProject();
    const rename = (content: string) => applyProjectName(content, projectName);

    const packageJsons = this.packageJsonMerger.merge(
      modules.flatMap((manifest) =>
        manifest.packageJson.map((contribution) => ({ moduleId: manifest.id, contribution })),
      ),
    );

    for (const manifest of modules) {
      for (const entry of manifest.files) {
        for (const file of await this.reader.listEntry(entry)) {
          if (path.posix.basename(file.targetPath) === COMPOSED_FILE_NAME) {
            this.assertComposedPackage(file.targetPath, packageJsons, manifest.id);
            continue;
          }

          const content = await this.reader.read(file.sourcePath);
          project.write(file.targetPath, isBinary(content) ? content : rename(content.toString('utf8')), manifest.id);
        }
      }

      for (const skill of new Set(manifest.skills)) {
        for (const file of await this.reader.listEntry({ source: `${SKILLS_DIR}/${skill}`, exclude: [] })) {
          if (project.has(file.targetPath)) continue;
          project.write(file.targetPath, rename(await this.reader.readText(file.sourcePath)), manifest.id);
        }
      }
    }

    for (const [workspace, packageJson] of packageJsons) {
      project.write(
        workspaceFile(workspace, COMPOSED_FILE_NAME),
        rename(this.packageJsonMerger.serialize(packageJson)),
        'package.json composition',
      );
    }

    const pnpmWorkspace = this.pnpmWorkspaceMerger.merge(
      modules.map((manifest) => ({ moduleId: manifest.id, contribution: manifest.pnpmWorkspace })),
    );
    this.pnpmWorkspaceMerger.assertCatalogCoverage(pnpmWorkspace, packageJsons);
    project.write(PNPM_WORKSPACE_FILE, rename(this.pnpmWorkspaceMerger.serialize(pnpmWorkspace)), 'pnpm workspace');

    for (const document of await this.markdownRenderer.render(modules)) {
      project.write(document.path, rename(document.content), 'markdown rendering');
    }

    return project;
  }

  private assertComposedPackage(targetPath: string, packageJsons: Map<string, unknown>, moduleId: string) {
    const workspace = path.posix.dirname(targetPath);
    if (packageJsons.has(workspace)) return;

    throw new GeneratorError(
      GENERATOR_ERROR_CODES.SOURCE_NOT_FOUND,
      `Module "${moduleId}" ships "${targetPath}", but no module declares a package.json for workspace "${workspace}"`,
    );
  }
}
