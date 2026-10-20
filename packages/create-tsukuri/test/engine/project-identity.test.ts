import { Linter } from 'eslint';
import { globSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { applyProjectName, getProjectNameProblem } from '#~/engine/project-identity';

import { REPOSITORY_ROOT } from '../helpers/temp-dir';

describe('project names', () => {
  it.each(['acme', 'my-app', 'my.app_2', 'a1'])('accepts "%s"', (name) => {
    expect(getProjectNameProblem(name)).toBeNull();
  });

  it.each(['', 'Acme', 'my app', '-acme', '.acme', '_acme', 'acme-', 'my--app', 'my.-app', 'node_modules'])(
    'rejects "%s"',
    (name) => {
      expect(getProjectNameProblem(name)).not.toBeNull();
    },
  );
});

describe('project name in shipped lint configs', () => {
  const lintConfigFiles = globSync(
    ['configs/lint-config/src/**/*.mjs', '{apps,packages}/*/{eslint,oxlint}.config.mjs', 'oxlint.config.mjs'],
    { cwd: REPOSITORY_ROOT },
  );

  it.each(lintConfigFiles)('%s still parses for a hyphenated project name', (file) => {
    const content = applyProjectName(readFileSync(path.join(REPOSITORY_ROOT, file), 'utf8'), 'my-app');
    const messages = new Linter({ cwd: REPOSITORY_ROOT }).verify(content, [{ files: ['**/*.mjs'] }], {
      filename: file,
    });

    expect(messages.filter((message) => message.fatal)).toEqual([]);
  });
});
