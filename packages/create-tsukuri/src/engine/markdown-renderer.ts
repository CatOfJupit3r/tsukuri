import { injectable } from 'tsyringe';

import type { MarkdownDocument } from '@~/enums/markdown-documents.enums';
import { MARKDOWN_DOCUMENT_OUTPUTS } from '@~/enums/markdown-documents.enums';
import type { iModuleManifest } from '@~/manifest/module-manifest.schema';
import type { iProjectRecord } from '@~/record/project-record.schema';

import type { iControlBlockOptions } from './control-block-renderer';
import { ControlBlockRenderer } from './control-block-renderer';
import { ModuleSourceReader } from './module-source-reader';
import type { iTemplateContext } from './template-renderer';
import { TemplateRenderer } from './template-renderer';

export interface iRenderedDocument {
  path: string;
  content: string;
}

interface iFragmentTemplate {
  source: string;
  template: string;
}

type iMarkdownRenderOptions = iProjectRecord['markdown'];

@injectable()
export class MarkdownRenderer {
  constructor(
    private readonly reader: ModuleSourceReader,
    private readonly controlBlocks: ControlBlockRenderer,
    private readonly templates: TemplateRenderer,
  ) {}

  /**
   * Renders every module's fragments once per output file and joins them in module order. Control blocks
   * are resolved first, so excluded blocks never reach Handlebars.
   */
  public async render(modules: iModuleManifest[], context: iTemplateContext, options: iMarkdownRenderOptions) {
    const documents: iRenderedDocument[] = [];

    for (const [document, fragments] of await this.readFragments(modules)) {
      for (const output of MARKDOWN_DOCUMENT_OUTPUTS.get(document)) {
        const parts = fragments
          .map((fragment) =>
            this.renderFragment(fragment, context, { ...options, harness: output.harness, source: fragment.source }),
          )
          .filter((part) => part.length > 0);
        const body = `${parts.join('\n\n')}\n`;
        documents.push({ path: output.path, content: output.frontmatter ? `${output.frontmatter}\n\n${body}` : body });
      }
    }

    return documents;
  }

  private async readFragments(modules: iModuleManifest[]) {
    const fragments = new Map<MarkdownDocument, iFragmentTemplate[]>();

    for (const manifest of modules) {
      for (const fragment of manifest.markdown) {
        const template = await this.reader.readText(fragment.source);
        fragments.set(fragment.document, [
          ...(fragments.get(fragment.document) ?? []),
          { source: fragment.source, template },
        ]);
      }
    }

    return fragments;
  }

  private renderFragment(fragment: iFragmentTemplate, context: iTemplateContext, options: iControlBlockOptions) {
    const selected = this.controlBlocks.render(fragment.template, options);
    return this.templates.renderText(selected, context, fragment.source).trim();
  }
}
