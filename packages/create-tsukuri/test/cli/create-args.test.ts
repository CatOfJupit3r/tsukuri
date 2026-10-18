import { parseCreateArgs } from '@~/cli/create-args';
import { GENERATOR_ERROR_CODES } from '@~/enums/generator-error-codes.enums';
import { PROMPT_IDS } from '@~/enums/prompt-ids.enums';

import { testModuleId } from '../helpers/manifests';

vi.mock('@~/enums/module-ids.enums', () => import('../helpers/test-module-ids'));

describe('parseCreateArgs', () => {
  it('reads the directory, prompt answers, skills and step flags', () => {
    const args = parseCreateArgs([
      'my-app',
      '--backend',
      'alpha',
      '--database=none',
      '--quality',
      'beta,gamma',
      '--exclude-skills',
      'review-code',
      '--no-git',
      '--install',
      '-y',
    ]);

    expect(args.directory).toBe('my-app');
    expect([...args.answers]).toEqual([
      [PROMPT_IDS.BACKEND, [testModuleId('alpha')]],
      [PROMPT_IDS.DATABASE, []],
      [PROMPT_IDS.QUALITY, [testModuleId('beta'), testModuleId('gamma')]],
    ]);
    expect(args.excludedSkills).toEqual(['review-code']);
    expect(args).toMatchObject({ isYes: true, shouldInitGit: false, shouldInstall: true, shouldVerify: null });
  });

  it.each([
    [['--backend', 'nope'], '--backend: "nope" is not a known id'],
    [['--backend', 'alpha,beta'], '--backend takes one module id'],
    [['--skills', 'review-code', '--exclude-skills', 'review-code'], 'Use either --skills or --exclude-skills'],
    [['a', 'b'], 'Expected one project directory'],
    [['--unknown'], 'Unknown option'],
  ])('rejects %j', (argv, message) => {
    expect(() => parseCreateArgs(argv)).toThrow(
      expect.objectContaining({
        code: GENERATOR_ERROR_CODES.INVALID_ARGUMENTS,
        message: expect.stringContaining(message),
      }),
    );
  });
});
