import path from 'node:path';
import { injectable } from 'tsyringe';

import type { iWorkerBindingContribution } from '#~/manifest/connection-point.schema';

import type { iTemplateContext } from '../../render/template-renderer';
import { CONNECTION_POINT_TEMPLATES, WRANGLER_CONFIG, WRANGLER_CONFIG_FILE } from '../connection-point.constants';
import type { iConnectionPointRenderer, iGeneratedFile, iOwnedContribution } from '../connection-point.types';
import { GENERATED_HEADER } from '../generated-header';
import { GeneratedSourceFiles } from '../generated-source-files';

/**
 * Per Worker workspace: `src/generated/worker-bindings.ts`, which types the bindings and registers them
 * in the container, and the `wrangler.jsonc` that declares them.
 */
@injectable()
export class WorkerBindingRenderer implements iConnectionPointRenderer<iWorkerBindingContribution> {
  public constructor(private readonly sourceFiles: GeneratedSourceFiles) {}

  public async render(
    items: iOwnedContribution<iWorkerBindingContribution>[],
    context: iTemplateContext,
    hostedWorkspaces: readonly string[],
  ) {
    const files: iGeneratedFile[] = [];

    for (const [workspace, bindings] of this.sourceFiles.groupByWorkspace(items, hostedWorkspaces)) {
      this.sourceFiles.assertUnique(
        bindings.map((binding) => binding.binding),
        (name) => `${workspace}: more than one module adds the Worker binding "${name}"`,
      );

      files.push(
        await this.sourceFiles.render(
          this.sourceFiles.sourcePath(workspace, 'worker-bindings.ts'),
          CONNECTION_POINT_TEMPLATES.workerBindings,
          {
            ...context,
            bindings,
            types: [...new Set(bindings.map((binding) => binding.type))].join(', '),
            imports: this.sourceFiles.groupNamedImports(bindings.map((binding) => binding.token)),
          },
        ),
        { path: path.posix.join(workspace, WRANGLER_CONFIG_FILE), content: this.renderWranglerConfig(bindings) },
      );
    }

    return files;
  }

  private renderWranglerConfig(bindings: iWorkerBindingContribution[]) {
    const sections = new Map<string, Record<string, unknown>[]>();
    for (const { binding, wrangler } of bindings) {
      sections.set(wrangler.section, [...(sections.get(wrangler.section) ?? []), { binding, ...wrangler.entry }]);
    }
    const config = { ...WRANGLER_CONFIG, ...Object.fromEntries(sections) };
    return `// ${GENERATED_HEADER}\n${JSON.stringify(config, null, 2)}\n`;
  }
}
