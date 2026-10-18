import path from 'node:path';
import { injectable } from 'tsyringe';

import { GENERATOR_ERROR_CODES } from '#~/enums/generator-error-codes.enums';
import type { iConnectionPointContribution } from '#~/manifest/connection-point.schema';

import { GeneratorError } from '../generator-error';
import type { iTemplateContext } from '../template-renderer';
import { TemplateRenderer } from '../template-renderer';
import type { iGeneratedFile, iOwnedContribution } from './connection-point.types';
import { GENERATED_SOURCE_DIR } from './generated-header';

interface iNamedImport {
  name: string;
  from: string;
}

interface iUniqueness<T> {
  value: (contribution: T) => string;
  describe: (workspace: string, value: string) => string;
}

/** How one kind of contribution becomes one generated source file per workspace. */
export interface iWorkspaceSourceSpec<T> {
  fileName: string;
  template: string;
  uniqueness?: iUniqueness<T>;
  imports?: (contribution: T) => iNamedImport[];
  /** Template variables besides `imports` and the shared context. */
  variables: (contributions: T[]) => Record<string, unknown>;
}

/** What the renderers share: grouping contributions per workspace, import lists and rendering into a file. */
@injectable()
export class GeneratedSourceFiles {
  constructor(private readonly templates: TemplateRenderer) {}

  /** Contributions per workspace, keeping module order inside each group; hosted workspaces get a group even when empty. */
  public groupByWorkspace<T extends iConnectionPointContribution & { workspace: string }>(
    items: iOwnedContribution<T>[],
    hostedWorkspaces: readonly string[] = [],
  ) {
    const groups = new Map<string, T[]>(hostedWorkspaces.map((workspace) => [workspace, []]));
    for (const { contribution } of items) {
      groups.set(contribution.workspace, [...(groups.get(contribution.workspace) ?? []), contribution]);
    }
    return groups;
  }

  /** Named imports grouped per specifier, in first-seen order: `{ names: 'a, b', from: 'x' }`. */
  public groupNamedImports(imports: iNamedImport[]) {
    const bySpecifier = new Map<string, string[]>();
    for (const { name, from } of imports) {
      const names = bySpecifier.get(from) ?? [];
      if (!names.includes(name)) names.push(name);
      bySpecifier.set(from, names);
    }
    return [...bySpecifier].map(([from, names]) => ({ names: names.join(', '), from }));
  }

  public assertUnique(values: string[], describe: (value: string) => string) {
    const seen = new Set<string>();
    for (const value of values) {
      if (seen.has(value)) throw new GeneratorError(GENERATOR_ERROR_CODES.MERGE_CONFLICT, describe(value));
      seen.add(value);
    }
  }

  /** `<workspace>/src/generated/<fileName>` */
  public sourcePath(workspace: string, fileName: string) {
    return path.posix.join(workspace, GENERATED_SOURCE_DIR, fileName);
  }

  public async render(filePath: string, template: string, context: iTemplateContext): Promise<iGeneratedFile> {
    return { path: filePath, content: await this.templates.render(template, context) };
  }

  public async renderPerWorkspace<T extends iConnectionPointContribution & { workspace: string }>(
    items: iOwnedContribution<T>[],
    spec: iWorkspaceSourceSpec<T>,
    context: iTemplateContext,
    hostedWorkspaces: readonly string[],
  ) {
    const files: iGeneratedFile[] = [];
    for (const [workspace, contributions] of this.groupByWorkspace(items, hostedWorkspaces)) {
      const { uniqueness, imports } = spec;
      if (uniqueness) {
        this.assertUnique(contributions.map(uniqueness.value), (value) => uniqueness.describe(workspace, value));
      }

      files.push(
        await this.render(this.sourcePath(workspace, spec.fileName), spec.template, {
          ...context,
          imports: imports ? this.groupNamedImports(contributions.flatMap(imports)) : [],
          ...spec.variables(contributions),
        }),
      );
    }
    return files;
  }
}
