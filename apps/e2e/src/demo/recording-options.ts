import type { BrowserContextOptions } from '@playwright/test';
import path from 'node:path';

const DEFAULT_VIEWPORT = '1440x900';
const COOKIE_SEPARATOR = '=';
const VIEWPORT_SEPARATOR = 'x';

type ColorScheme = NonNullable<BrowserContextOptions['colorScheme']>;

/** `--theme` values, which are also the browser color schemes they select. */
const THEME_COLOR_SCHEMES: readonly ColorScheme[] = ['dark', 'light'];
const DEFAULT_COLOR_SCHEME: ColorScheme = 'no-preference';

export interface iRecordingOptions {
  flowPath: string;
  /** Output path without extension; the recording is `<out>.mp4` and screenshots land next to it. */
  outputBasePath: string;
  appPath: string;
  viewport: { width: number; height: number };
  colorScheme: ColorScheme;
  /** A cookie the app reads its theme from, set before the first page load. */
  themeCookie: { name: string; value: string } | null;
  waitForSelector: string | null;
  baseUrl: string | null;
  storageStatePath: string | null;
}

export const RECORDING_USAGE = [
  'Usage: pnpm run e2e:record --flow <flow.ts> --out <path without extension> --app <path>',
  '  [--viewport 1440x900] [--theme dark|light] [--theme-cookie <name>=<value>] [--wait-for <selector>]',
  '  [--base-url <url>] [--storage-state <signed-in Playwright state>]',
].join('\n');

function readOption(argv: readonly string[], optionName: string) {
  const optionIndex = argv.indexOf(`--${optionName}`);
  return optionIndex === -1 ? null : (argv[optionIndex + 1] ?? null);
}

function parseViewport(rawViewport: string) {
  const [width, height] = rawViewport.split(VIEWPORT_SEPARATOR).map(Number);
  if (!width || !height) throw new Error(`--viewport takes WIDTHxHEIGHT, got "${rawViewport}"`);
  return { width, height };
}

function parseColorScheme(rawTheme: string | null) {
  return THEME_COLOR_SCHEMES.find((colorScheme) => colorScheme === rawTheme) ?? DEFAULT_COLOR_SCHEME;
}

function parseThemeCookie(rawCookie: string | null) {
  if (rawCookie === null) return null;
  const separatorIndex = rawCookie.indexOf(COOKIE_SEPARATOR);
  if (separatorIndex <= 0) throw new Error(`--theme-cookie takes <name>=<value>, got "${rawCookie}"`);
  return { name: rawCookie.slice(0, separatorIndex), value: rawCookie.slice(separatorIndex + 1) };
}

/** Paths are relative to where the command was typed: pnpm runs the script inside this workspace. */
export function parseRecordingOptions(argv: readonly string[], invocationDirectory: string): iRecordingOptions {
  const flowPath = readOption(argv, 'flow');
  const outputBasePath = readOption(argv, 'out');
  const appPath = readOption(argv, 'app');
  if (flowPath === null || outputBasePath === null || appPath === null) throw new Error(RECORDING_USAGE);

  const storageStatePath = readOption(argv, 'storage-state');
  return {
    flowPath: path.resolve(invocationDirectory, flowPath),
    outputBasePath: path.resolve(invocationDirectory, outputBasePath),
    appPath,
    viewport: parseViewport(readOption(argv, 'viewport') ?? DEFAULT_VIEWPORT),
    colorScheme: parseColorScheme(readOption(argv, 'theme')),
    themeCookie: parseThemeCookie(readOption(argv, 'theme-cookie')),
    waitForSelector: readOption(argv, 'wait-for'),
    baseUrl: readOption(argv, 'base-url'),
    storageStatePath: storageStatePath === null ? null : path.resolve(invocationDirectory, storageStatePath),
  };
}
