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

/** The file each document is rendered into. */
export const MARKDOWN_DOCUMENT_OUTPUTS = markdownDocumentsEnumwaii.derive<iMarkdownDocumentOutput>()(
  [MARKDOWN_DOCUMENTS.AGENTS, { path: 'AGENTS.md', frontmatter: "---\napplyTo: '**/*.ts'\n---" }],
  [MARKDOWN_DOCUMENTS.README, { path: 'README.md', frontmatter: null }],
);
