import { injectable } from 'tsyringe';

import { GENERATOR_NAME, GENERATOR_VERSION } from '@~/constants/generator-info';
import type { ModuleId } from '@~/enums/module-ids.enums';
import type { SkillId } from '@~/enums/skill-ids.enums';
import type { iProjectRecord } from '@~/record/project-record.schema';

import { ModuleResolver } from './module-resolver';
import { ProjectComposer } from './project-composer';
import { assertProjectName } from './project-identity';
import { ProjectWriter } from './project-writer';

export interface iCreateProjectOptions {
  targetDir: string;
  projectName: string;
  modules: readonly ModuleId[];
  excludedSkills?: readonly SkillId[];
}

@injectable()
export class ProjectGenerator {
  constructor(
    private readonly resolver: ModuleResolver,
    private readonly composer: ProjectComposer,
    private readonly writer: ProjectWriter,
  ) {}

  /** Resolves the selection into a module record, then composes and writes it into an empty folder. */
  public async create({ targetDir, projectName, modules, excludedSkills = [] }: iCreateProjectOptions) {
    assertProjectName(projectName);
    const resolved = this.resolver.resolve(modules);
    const record: iProjectRecord = {
      projectName,
      generator: { name: GENERATOR_NAME, version: GENERATOR_VERSION },
      modules: resolved.modules.map((manifest) => ({ id: manifest.id, version: manifest.version, options: {} })),
      skills: { excluded: [...excludedSkills] },
      markdown: { includePrivate: false },
    };

    const project = await this.compose(record);
    await this.writer.writeNew(targetDir, project);
    return { resolved, record, project };
  }

  /** Builds the project tree a module record describes. */
  public async compose(record: iProjectRecord) {
    assertProjectName(record.projectName);
    const { modules } = this.resolver.resolve(record.modules.map((recorded) => recorded.id));
    return this.composer.compose({ modules, record });
  }
}
