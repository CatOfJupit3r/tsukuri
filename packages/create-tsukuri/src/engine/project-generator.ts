import { injectable } from 'tsyringe';

import { GENERATOR_NAME, GENERATOR_VERSION } from '#~/constants/generator-info';
import type { ModuleId } from '#~/enums/module-ids.enums';
import type { SkillId } from '#~/enums/skill-ids.enums';
import type { iProjectRecord } from '#~/record/project-record.schema';

import { ENV_EXAMPLE_FILE } from './connection-points/connection-point.constants';
import { LocalEnvRenderer } from './local-env-renderer';
import { ModuleOptionResolver } from './module-option-resolver';
import type { iModuleOptionValues } from './module-option-resolver';
import { ModuleResolver } from './module-resolver';
import { ProjectComposer } from './project-composer';
import { assertProjectName } from './project-identity';
import { ProjectTargetGuard } from './project-target-guard';
import { ProjectWriter } from './project-writer';

export interface iCreateProjectOptions {
  targetDir: string;
  projectName: string;
  modules: readonly ModuleId[];
  excludedSkills?: readonly SkillId[];
  /** Answers to the selected modules' options; unanswered ones take their default. */
  options?: iModuleOptionValues;
}

@injectable()
export class ProjectGenerator {
  constructor(
    private readonly resolver: ModuleResolver,
    private readonly composer: ProjectComposer,
    private readonly writer: ProjectWriter,
    private readonly targetGuard: ProjectTargetGuard,
    private readonly optionResolver: ModuleOptionResolver,
    private readonly localEnvRenderer: LocalEnvRenderer,
  ) {}

  /** Resolves the selection into a module record, then composes and writes it into an empty folder. */
  public async create({
    targetDir,
    projectName,
    modules,
    excludedSkills = [],
    options = new Map(),
  }: iCreateProjectOptions) {
    assertProjectName(projectName);
    this.targetGuard.assertTarget(targetDir);
    const resolved = this.resolver.resolve(modules);
    const record: iProjectRecord = {
      projectName,
      generator: { name: GENERATOR_NAME, version: GENERATOR_VERSION },
      modules: resolved.modules.map((manifest) => ({
        id: manifest.id,
        version: manifest.version,
        options: this.optionResolver.valuesFor(manifest, options),
      })),
      skills: { excluded: [...excludedSkills] },
      markdown: { includePrivate: false },
    };

    const project = await this.compose(record);
    const envExample = project.get(ENV_EXAMPLE_FILE);
    const localFiles: Record<string, string> = envExample
      ? { '.env': this.localEnvRenderer.render(envExample.content.toString('utf8')) }
      : {};
    await this.writer.writeNew(targetDir, project, localFiles);
    return { resolved, record, project };
  }

  /** Builds the project tree a module record describes. */
  public async compose(record: iProjectRecord) {
    assertProjectName(record.projectName);
    const { modules } = this.resolver.resolve(record.modules.map((recorded) => recorded.id));
    return this.composer.compose({ modules: this.optionResolver.withChosenContributions(modules, record), record });
  }
}
