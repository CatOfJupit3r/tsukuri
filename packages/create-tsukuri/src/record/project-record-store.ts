import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { injectable } from 'tsyringe';

import { GeneratorError } from '#~/engine/generator-error';
import { GENERATOR_ERROR_CODES } from '#~/enums/generator-error-codes.enums';

import { PROJECT_RECORD_FILE, projectRecordSchema } from './project-record.schema';

@injectable()
export class ProjectRecordStore {
  /** Reads and validates the module record of a generated project. */
  public async read(projectDir: string) {
    const recordPath = path.join(projectDir, PROJECT_RECORD_FILE);
    let raw: string;
    try {
      raw = await readFile(recordPath, 'utf8');
    } catch {
      throw new GeneratorError(
        GENERATOR_ERROR_CODES.PROJECT_RECORD_NOT_FOUND,
        `No ${PROJECT_RECORD_FILE} in "${projectDir}"; run this inside a project made by create-tsukuri`,
      );
    }

    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch (error) {
      throw new GeneratorError(
        GENERATOR_ERROR_CODES.INVALID_PROJECT_RECORD,
        `${PROJECT_RECORD_FILE} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    const parsed = projectRecordSchema.safeParse(json);
    if (!parsed.success) {
      throw new GeneratorError(
        GENERATOR_ERROR_CODES.INVALID_PROJECT_RECORD,
        `${PROJECT_RECORD_FILE} is invalid:\n${parsed.error.issues
          .map((issue) => `  - ${issue.path.join('.') || '<root>'}: ${issue.message}`)
          .join('\n')}`,
      );
    }
    return parsed.data;
  }
}
