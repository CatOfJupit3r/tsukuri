import { injectable } from 'tsyringe';

import type { ModuleId } from '@~/enums/module-ids.enums';

import { ModuleResolver } from './module-resolver';
import { ProjectComposer } from './project-composer';
import { assertProjectName } from './project-identity';
import { ProjectWriter } from './project-writer';

export interface iCreateProjectOptions {
  targetDir: string;
  projectName: string;
  modules: readonly ModuleId[];
}

@injectable()
export class ProjectGenerator {
  constructor(
    private readonly resolver: ModuleResolver,
    private readonly composer: ProjectComposer,
    private readonly writer: ProjectWriter,
  ) {}

  /** Resolves, composes and writes a new project into an empty folder. */
  public async create({ targetDir, projectName, modules }: iCreateProjectOptions) {
    assertProjectName(projectName);
    const resolved = this.resolver.resolve(modules);
    const project = await this.composer.compose({ modules: resolved.modules, projectName });
    await this.writer.writeNew(targetDir, project);
    return { resolved, project };
  }
}
