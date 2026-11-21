/**
 * Reports a folder that holds more source files than the limit, so files get
 * grouped into subfolders by domain or purpose. Reported on every linted file
 * of the folder: a staged file is reported even when the folder's first file
 * is not part of the run.
 */
import { readdirSync } from 'node:fs';
import path from 'node:path';

import { BASE_IGNORE_PATTERNS } from '../lint-ignores.mjs';
import { MAX_FILES_PER_FOLDER } from '../lint-limits.mjs';

/** Extensions of the files the convention rules lint, and the only ones this rule counts. */
export const CONVENTION_SOURCE_EXTENSIONS = ['ts', 'tsx'];

const SOURCE_FILE_PATTERN = new RegExp(`\\.(${CONVENTION_SOURCE_EXTENSIONS.join('|')})$`, 'u');
const DECLARATION_FILE_PATTERN = /\.d\.ts$/u;

function listSourceFiles({ folder, workspaceDirectory, ignores }) {
  return readdirSync(folder, { withFileTypes: true })
    .filter(
      (entry) => entry.isFile() && SOURCE_FILE_PATTERN.test(entry.name) && !DECLARATION_FILE_PATTERN.test(entry.name),
    )
    .filter(
      (entry) =>
        !ignores.some((pattern) =>
          path.matchesGlob(path.relative(workspaceDirectory, path.join(folder, entry.name)), pattern),
        ),
    )
    .map((entry) => entry.name);
}

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
        properties: {
          max: { type: 'integer', minimum: 1 },
          ignores: { type: 'array', items: { type: 'string' } },
        },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const max = context.options[0]?.max ?? MAX_FILES_PER_FOLDER;
    const ignores = context.options[0]?.ignores ?? BASE_IGNORE_PATTERNS;
    const folder = path.dirname(context.physicalFilename);
    const sourceFiles = listSourceFiles({
      folder,
      workspaceDirectory: context.cwd,
      ignores,
    });

    if (sourceFiles.length <= max || !sourceFiles.includes(path.basename(context.physicalFilename))) {
      return {};
    }

    return {
      Program(node) {
        context.report({
          node,
          messageId: 'tooManyFiles',
          data: { count: sourceFiles.length, max },
        });
      },
    };
  },
};
