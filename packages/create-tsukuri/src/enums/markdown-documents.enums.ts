import { em } from 'enumwaii';
import { emToZodSchema } from 'enumwaii/zod';

const markdownDocumentsEnumwaii = em(['AGENTS', 'README']);

export const MARKDOWN_DOCUMENTS = markdownDocumentsEnumwaii.enum;
export type MarkdownDocument = (typeof markdownDocumentsEnumwaii)['~type'];
export const markdownDocumentSchema = emToZodSchema(markdownDocumentsEnumwaii);

interface iMarkdownDocumentOutput {
  path: string;
  frontmatter: string | null;
}

/** Every file a document is rendered into. AGENTS.md and CLAUDE.md share the same fragments. */
export const MARKDOWN_DOCUMENT_OUTPUTS = markdownDocumentsEnumwaii.derive<iMarkdownDocumentOutput[]>()(
  [
    MARKDOWN_DOCUMENTS.AGENTS,
    [
      { path: 'AGENTS.md', frontmatter: "---\napplyTo: '**/*.ts'\n---" },
      { path: 'CLAUDE.md', frontmatter: null },
    ],
  ],
  [MARKDOWN_DOCUMENTS.README, [{ path: 'README.md', frontmatter: null }]],
);
