import path from 'node:path';

import { parseRecordingOptions } from '#~/demo/recording-options';

const INVOCATION_DIRECTORY = path.resolve('/projects/acme');
const REQUIRED_ARGUMENTS = ['--flow', 'demo/flow.ts', '--out', 'demo/42-home-desktop-dark', '--app', '/'];

describe('parseRecordingOptions', () => {
  it('resolves paths from where the command was typed and defaults to a desktop viewport', () => {
    expect(parseRecordingOptions(REQUIRED_ARGUMENTS, INVOCATION_DIRECTORY)).toMatchObject({
      flowPath: path.join(INVOCATION_DIRECTORY, 'demo/flow.ts'),
      outputBasePath: path.join(INVOCATION_DIRECTORY, 'demo/42-home-desktop-dark'),
      viewport: { width: 1440, height: 900 },
      colorScheme: 'no-preference',
      themeCookie: null,
    });
  });

  it('sets the color scheme and the theme cookie the app reads', () => {
    const options = parseRecordingOptions(
      [...REQUIRED_ARGUMENTS, '--theme', 'dark', '--theme-cookie', 'acme.theme=DARK=1', '--viewport', '390x844'],
      INVOCATION_DIRECTORY,
    );

    expect(options).toMatchObject({
      colorScheme: 'dark',
      themeCookie: { name: 'acme.theme', value: 'DARK=1' },
      viewport: { width: 390, height: 844 },
    });
  });

  it('rejects a theme cookie without a name and a call without a flow', () => {
    expect(() =>
      parseRecordingOptions([...REQUIRED_ARGUMENTS, '--theme-cookie', '=DARK'], INVOCATION_DIRECTORY),
    ).toThrow(/--theme-cookie takes <name>=<value>/);
    expect(() => parseRecordingOptions(['--app', '/'], INVOCATION_DIRECTORY)).toThrow(/Usage:/);
  });
});
