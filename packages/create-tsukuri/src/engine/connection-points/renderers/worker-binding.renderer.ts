import path from 'node:path';
import { injectable } from 'tsyringe';

import { WORKER_BINDING_TYPE_META } from '#~/enums/worker-bindings.enums';
import type { WranglerBindingSection } from '#~/enums/worker-bindings.enums';
import type { iWorkerBindingContribution } from '#~/manifest/connection-point.schema';

import type { iTemplateContext } from '../../template-renderer';
import {
  CONNECTION_POINT_TEMPLATES,
  MAX_WORKER_NAME_LENGTH,
  WRANGLER_CONFIG,
  WRANGLER_CONFIG_FILE,
} from '../connection-point.constants';
import type { iConnectionPointRenderer, iGeneratedFile, iOwnedContribution } from '../connection-point.types';
import { GENERATED_HEADER } from '../generated-header';
import { GeneratedSourceFiles } from '../generated-source-files';

/** Characters a project name may have that a Worker name may not. */
const NON_WORKER_NAME_CHARACTERS = /[^a-z0-9-]/g;
const WORKER_NAME_SEPARATOR = '-';
const TRAILING_SEPARATORS = /-+$/;

/**
 * Per Worker workspace: `src/generated/worker-bindings.ts`, which types the bindings and registers them
 * in the container, and the `wrangler.jsonc` that declares them.
 */
@injectable()
export class WorkerBindingRenderer implements iConnectionPointRenderer<iWorkerBindingContribution> {
  constructor(private readonly sourceFiles: GeneratedSourceFiles) {}

  public async render(
    items: iOwnedContribution<iWorkerBindingContribution>[],
    context: iTemplateContext,
    hostedWorkspaces: readonly string[],
  ) {
    const bindingSources = await this.sourceFiles.renderPerWorkspace(
      items,
      {
        fileName: 'worker-bindings.ts',
        template: CONNECTION_POINT_TEMPLATES.workerBindings,
        uniqueness: {
          value: (binding) => binding.binding,
          describe: (workspace, name) => `${workspace}: more than one module adds the Worker binding "${name}"`,
        },
        imports: (binding) => [binding.token],
        variables: (bindings) => ({
          bindings,
          types: [...new Set(bindings.map((binding) => binding.type))].join(', '),
        }),
      },
      context,
      hostedWorkspaces,
    );

    const wranglerConfigs: iGeneratedFile[] = [...this.sourceFiles.groupByWorkspace(items, hostedWorkspaces)].map(
      ([workspace, bindings]) => ({
        path: path.posix.join(workspace, WRANGLER_CONFIG_FILE),
        content: this.renderWranglerConfig(this.toWorkerName(context.projectName), bindings),
      }),
    );

    return [...bindingSources, ...wranglerConfigs];
  }

  private renderWranglerConfig(name: string, bindings: iWorkerBindingContribution[]) {
    const sections = new Map<WranglerBindingSection, Record<string, unknown>[]>();
    for (const { binding, type, entry } of bindings) {
      const { section } = WORKER_BINDING_TYPE_META.get(type);
      sections.set(section, [...(sections.get(section) ?? []), { binding, ...entry }]);
    }
    const config = { name, ...WRANGLER_CONFIG, ...Object.fromEntries(sections) };
    return `// ${GENERATED_HEADER}\n${JSON.stringify(config, null, 2)}\n`;
  }

  /** The project name as a Worker name: dots and underscores become dashes, cut to Cloudflare's length limit. */
  private toWorkerName(projectName: string) {
    return projectName
      .replaceAll(NON_WORKER_NAME_CHARACTERS, WORKER_NAME_SEPARATOR)
      .slice(0, MAX_WORKER_NAME_LENGTH)
      .replace(TRAILING_SEPARATORS, '');
  }
}
