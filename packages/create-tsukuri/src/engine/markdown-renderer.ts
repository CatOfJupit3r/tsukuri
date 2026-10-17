import { injectable } from 'tsyringe';

import type { MarkdownDocument } from '@~/enums/markdown-documents.enums';
import { MARKDOWN_DOCUMENT_OUTPUTS } from '@~/enums/markdown-documents.enums';
import type { iModuleManifest } from '@~/manifest/module-manifest.schema';

import { renderModuleBlocks } from './module-blocks';
import { ModuleSourceReader } from './module-source-reader';

export interface iRenderedDocument {
  path: string;
  content: string;
}

@injectable()
export class MarkdownRenderer {
  constructor(private readonly reader: ModuleSourceReader) {}

  /** Joins every module's fragments per document, in module order, resolving `<module>` blocks. */
  public async render(modules: iModuleManifest[]) {
    const bodies = new Map<MarkdownDocument, string[]>();
    const installed = new Set(modules.map((manifest) => manifest.id));

    for (const manifest of modules) {
      for (const fragment of manifest.markdown) {
        const raw = await this.reader.readText(fragment.source);
        const text = renderModuleBlocks(raw, installed, fragment.source).trim();
        bodies.set(fragment.document, [...(bodies.get(fragment.document) ?? []), text]);
      }
    }

    const documents: iRenderedDocument[] = [];
    for (const [document, parts] of bodies) {
      const body = `${parts.join('\n\n')}\n`;
      for (const output of MARKDOWN_DOCUMENT_OUTPUTS.get(document)) {
        documents.push({
          path: output.path,
          content: output.frontmatter ? `${output.frontmatter}\n\n${body}` : body,
        });
      }
    }
    return documents;
  }
}
