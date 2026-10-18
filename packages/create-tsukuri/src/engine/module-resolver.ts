import { injectable } from 'tsyringe';

import type { Capability } from '@~/enums/capabilities.enums';
import { CAPABILITY_META } from '@~/enums/capabilities.enums';
import { GENERATOR_ERROR_CODES } from '@~/enums/generator-error-codes.enums';
import { MODULE_CATEGORY_ORDER } from '@~/enums/module-categories.enums';
import type { ModuleId } from '@~/enums/module-ids.enums';
import type { iModuleManifest } from '@~/manifest/module-manifest.schema';

import { GeneratorError } from './generator-error';
import { ModuleRegistry } from './module-registry';

export interface iResolvedModules {
  /** Every module to install, dependencies first. */
  modules: iModuleManifest[];
  /** Modules that were not selected but are installed because something requires them. */
  addedIds: ModuleId[];
}

function compareModules(left: iModuleManifest, right: iModuleManifest) {
  const byCategory = MODULE_CATEGORY_ORDER.get(left.category) - MODULE_CATEGORY_ORDER.get(right.category);
  if (byCategory !== 0) return byCategory;
  return left.id.localeCompare(right.id);
}

@injectable()
export class ModuleResolver {
  constructor(private readonly registry: ModuleRegistry) {}

  /** Expands `selected` with always-included and required modules, validates the set, and orders it. */
  public resolve(selected: readonly ModuleId[]): iResolvedModules {
    const selectedSet = new Set(selected);
    const included = new Map<ModuleId, iModuleManifest>();
    const queue: ModuleId[] = [
      ...this.registry
        .list()
        .filter((manifest) => manifest.isAlwaysIncluded)
        .map((manifest) => manifest.id),
      ...selected,
    ];

    for (let id = queue.shift(); id !== undefined; id = queue.shift()) {
      if (included.has(id)) continue;

      const manifest = this.registry.get(id);
      included.set(id, manifest);
      queue.push(...manifest.requires);
    }

    const modules = [...included.values()];
    this.assertNoConflicts(modules);
    this.assertCapabilities(modules);

    return {
      modules: this.order(modules),
      addedIds: modules
        .filter((manifest) => !selectedSet.has(manifest.id) && !manifest.isAlwaysIncluded)
        .map((manifest) => manifest.id),
    };
  }

  private assertNoConflicts(modules: iModuleManifest[]) {
    const ids = new Set(modules.map((manifest) => manifest.id));
    const messages: string[] = [];

    for (const manifest of modules) {
      for (const conflict of manifest.conflicts) {
        if (!ids.has(conflict)) continue;
        messages.push(`"${manifest.id}" conflicts with "${conflict}"`);
      }
    }

    if (messages.length > 0) {
      throw new GeneratorError(GENERATOR_ERROR_CODES.MODULE_CONFLICT, `Incompatible modules: ${messages.join('; ')}`);
    }
  }

  private assertCapabilities(modules: iModuleManifest[]) {
    const providers = new Map<Capability, ModuleId[]>();
    for (const manifest of modules) {
      for (const capability of manifest.provides) {
        providers.set(capability, [...(providers.get(capability) ?? []), manifest.id]);
      }
    }

    for (const [capability, providerIds] of providers) {
      if (!CAPABILITY_META.get(capability).isExclusive || providerIds.length < 2) continue;
      throw new GeneratorError(
        GENERATOR_ERROR_CODES.CAPABILITY_CONFLICT,
        `Only one module may provide "${capability}", but ${providerIds.map((id) => `"${id}"`).join(', ')} all do`,
      );
    }

    for (const manifest of modules) {
      for (const capability of manifest.requiresCapabilities) {
        if (providers.has(capability)) continue;

        const candidates = this.registry
          .list()
          .filter((candidate) => candidate.provides.includes(capability))
          .map((candidate) => `"${candidate.id}"`);
        const hint = candidates.length > 0 ? ` Add one of: ${candidates.join(', ')}.` : '';

        throw new GeneratorError(
          GENERATOR_ERROR_CODES.MISSING_CAPABILITY,
          `"${manifest.id}" needs a module that provides "${capability}".${hint}`,
        );
      }
    }
  }

  /** Topological order (requirements and capability providers first), ties broken by category then id. */
  private order(modules: iModuleManifest[]) {
    const ids = new Set(modules.map((manifest) => manifest.id));
    const dependencies = new Map<ModuleId, Set<ModuleId>>();

    for (const manifest of modules) {
      const edges = new Set<ModuleId>(manifest.requires.filter((id) => ids.has(id)));
      for (const capability of manifest.requiresCapabilities) {
        for (const provider of modules) {
          if (provider.id !== manifest.id && provider.provides.includes(capability)) edges.add(provider.id);
        }
      }
      dependencies.set(manifest.id, edges);
    }

    const ordered: iModuleManifest[] = [];
    const remaining = new Set(ids);

    while (remaining.size > 0) {
      const ready = modules
        .filter((manifest) => remaining.has(manifest.id))
        .filter((manifest) =>
          [...(dependencies.get(manifest.id) ?? [])].every((dependency) => !remaining.has(dependency)),
        )
        .toSorted(compareModules);

      const next = ready[0];
      if (!next) {
        throw new GeneratorError(
          GENERATOR_ERROR_CODES.DEPENDENCY_CYCLE,
          `Module requirements form a cycle between: ${[...remaining].map((id) => `"${id}"`).join(', ')}`,
        );
      }

      ordered.push(next);
      remaining.delete(next.id);
    }

    return ordered;
  }
}
