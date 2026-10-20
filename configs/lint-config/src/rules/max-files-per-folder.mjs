/**
 * Reports a folder that holds more source files than the limit, so files get
 * grouped into subfolders by domain or purpose. Reported once per folder, on
 * its first source file in name order.
 */
import { readdirSync } from 'node:fs';
import path from 'node:path';

import { MAX_FILES_PER_FOLDER } from '../lint-limits.mjs';

/** Extensions of the files the convention rules lint, and the only ones this rule counts. */
export const CONVENTION_SOURCE_EXTENSIONS = ['ts', 'tsx'];

const SOURCE_FILE_PATTERN = new RegExp(`\\.(${CONVENTION_SOURCE_EXTENSIONS.join('|')})$`, 'u');
const DECLARATION_FILE_PATTERN = /\.d\.ts$/u;

const listSourceFiles = (folder) =>
  readdirSync(folder, { withFileTypes: true })
    .filter(
      (entry) => entry.isFile() && SOURCE_FILE_PATTERN.test(entry.name) && !DECLARATION_FILE_PATTERN.test(entry.name),
    )
    .map((entry) => entry.name)
    .toSorted((left, right) => left.localeCompare(right));

export const maxFilesPerFolderRule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Limit how many source files one folder holds.',
    },
    messages: {
      tooManyFiles:
        'This folder holds {{count}} source files (max {{max}}). Group them into subfolders by domain or purpose.',
    },
    schema: [
      {
        type: 'object',
        properties: { max: { type: 'integer', minimum: 1 } },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const max = context.options[0]?.max ?? MAX_FILES_PER_FOLDER;
    const folder = path.dirname(context.physicalFilename);
    const sourceFiles = listSourceFiles(folder);

    if (sourceFiles.length <= max || sourceFiles[0] !== path.basename(context.physicalFilename)) {
      return {};
    }

    return {
      Program(node) {
        context.report({ node, messageId: 'tooManyFiles', data: { count: sourceFiles.length, max } });
      },
    };
  },
};
