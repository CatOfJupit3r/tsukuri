import { em } from 'enumwaii';
import { emToZodSchema } from 'enumwaii/zod';

import type { Harness } from './harnesses.enums';
import { HARNESSES } from './harnesses.enums';

const markdownDocumentsEnumwaii = em(['AGENTS', 'README']);

export const MARKDOWN_DOCUMENTS = markdownDocumentsEnumwaii.enum;
export type MarkdownDocument = (typeof markdownDocumentsEnumwaii)['~type'];
export const markdownDocumentSchema = emToZodSchema(markdownDocumentsEnumwaii);

interface iMarkdownDocumentOutput {
  path: string;
  frontmatter: string | null;
  /** Selects the `<harness-specific>` blocks the file keeps; `null` keeps none. */
  harness: Harness | null;
}

/** Every file a document is rendered into. AGENTS.md and CLAUDE.md share the same fragments. */
export const MARKDOWN_DOCUMENT_OUTPUTS = markdownDocumentsEnumwaii.derive<iMarkdownDocumentOutput[]>()(
  [
    MARKDOWN_DOCUMENTS.AGENTS,
    [
      { path: 'AGENTS.md', frontmatter: "---\napplyTo: '**/*.ts'\n---", harness: HARNESSES.CODEX },
      { path: 'CLAUDE.md', frontmatter: null, harness: HARNESSES.CLAUDE },
    ],
  ],
  [MARKDOWN_DOCUMENTS.README, [{ path: 'README.md', frontmatter: null, harness: null }]],
);
