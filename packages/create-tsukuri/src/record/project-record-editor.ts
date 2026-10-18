import { injectable } from 'tsyringe';

import { GeneratorError } from '#~/engine/generator-error';
import { ModuleRegistry } from '#~/engine/module-registry';
import { ModuleResolver } from '#~/engine/module-resolver';
import { GENERATOR_ERROR_CODES } from '#~/enums/generator-error-codes.enums';
import type { ModuleId } from '#~/enums/module-ids.enums';
import type { SkillId } from '#~/enums/skill-ids.enums';
import type { iModuleManifest } from '#~/manifest/module-manifest.schema';

import type { iProjectRecord } from './project-record.schema';

/** Computes the next module record for `add` / `remove`; nothing here touches the disk. */
@injectable()
export class ProjectRecordEditor {
  constructor(
    private readonly registry: ModuleRegistry,
    private readonly resolver: ModuleResolver,
  ) {}

  public installedIds(record: iProjectRecord) {
    return record.modules.map((recorded) => recorded.id);
  }

  /** Modules that are not installed and fit next to the installed ones. */
  public addableModules(record: iProjectRecord): iModuleManifest[] {
    const installed = this.installedIds(record);
    return this.registry
      .list()
      .filter((manifest) => !manifest.isAlwaysIncluded && !installed.includes(manifest.id))
      .filter((manifest) => this.resolver.isCompatible(installed, manifest.id));
  }

  public withModulesAdded(record: iProjectRecord, ids: readonly ModuleId[]) {
    const installed = this.installedIds(record);
    const alreadyInstalled = ids.filter((id) => installed.includes(id));
    if (alreadyInstalled.length > 0) {
      throw new GeneratorError(
        GENERATOR_ERROR_CODES.INVALID_ARGUMENTS,
        `Already installed: ${alreadyInstalled.join(', ')}`,
      );
    }
    return this.withModules(record, [...installed, ...ids]);
  }

  public withModulesRemoved(record: iProjectRecord, ids: readonly ModuleId[]) {
    const installed = this.installedIds(record);
    for (const id of ids) {
      if (!installed.includes(id)) {
        throw new GeneratorError(GENERATOR_ERROR_CODES.INVALID_ARGUMENTS, `"${id}" is not installed`);
      }
      if (this.registry.get(id).isAlwaysIncluded) {
        throw new GeneratorError(GENERATOR_ERROR_CODES.INVALID_ARGUMENTS, `"${id}" is part of every project`);
      }
    }

    const remaining = installed.filter((id) => !ids.includes(id));
    for (const id of ids) {
      const dependents = remaining.filter((other) => this.registry.get(other).requires.includes(id));
      if (dependents.length > 0) {
        throw new GeneratorError(
          GENERATOR_ERROR_CODES.MODULE_CONFLICT,
          `"${id}" is required by ${dependents.map((other) => `"${other}"`).join(', ')}; remove those first`,
        );
      }
    }
    return this.withModules(record, remaining);
  }

  public withSkillsIncluded(record: iProjectRecord, ids: readonly SkillId[]) {
    this.assertApplicableSkills(record, ids);
    return { ...record, skills: { excluded: record.skills.excluded.filter((id) => !ids.includes(id)) } };
  }

  public withSkillsExcluded(record: iProjectRecord, ids: readonly SkillId[]) {
    this.assertApplicableSkills(record, ids);
    return { ...record, skills: { excluded: [...new Set([...record.skills.excluded, ...ids])] } };
  }

  private withModules(record: iProjectRecord, ids: readonly ModuleId[]): iProjectRecord {
    const { modules } = this.resolver.resolve(ids);
    const optionsById = new Map(record.modules.map((recorded) => [recorded.id, recorded.options]));
    const skills = new Set(modules.flatMap((manifest) => manifest.skills));

    return {
      ...record,
      modules: modules.map((manifest) => ({
        id: manifest.id,
        version: manifest.version,
        options: optionsById.get(manifest.id) ?? {},
      })),
      skills: { excluded: record.skills.excluded.filter((id) => skills.has(id)) },
    };
  }

  private assertApplicableSkills(record: iProjectRecord, ids: readonly SkillId[]) {
    const shipped = new Set(this.installedIds(record).flatMap((id) => this.registry.get(id).skills));
    const unknown = ids.filter((id) => !shipped.has(id));
    if (unknown.length > 0) {
      throw new GeneratorError(
        GENERATOR_ERROR_CODES.INVALID_ARGUMENTS,
        `No installed module ships these skills: ${unknown.join(', ')}`,
      );
    }
  }
}
