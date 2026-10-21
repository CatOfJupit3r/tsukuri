/**
 * Records a short flow of the running app as an MP4 for a PR demo, with the URL, the keys pressed and the cursor
 * shown on top. It adds no captions. Start the stack first (`pnpm run e2e:stack`), then write a flow module:
 *
 *   export async function runFlow(page, { pause, screenshot }) {
 *     await page.getByRole('button', { name: 'Act' }).click();
 *     await pause(800);
 *     await screenshot('42-home-phone-dark');
 *   }
 *
 * and record it: `pnpm run e2e:record --flow <flow.ts> --out <dir>/<issue>-<surface>-<theme> --app /`. Options are
 * listed in `RECORDING_USAGE`; `--theme-cookie <name>=<value>` sets the cookie an app reads its theme from. Produces
 * `<out>.mp4` (through ffmpeg) with screenshots next to it as `<name>.png`. Keep flows under about 20 seconds and use
 * the mouse API (page.mouse, locator actions) so the cursor shows.
 */
import { chromium } from '@playwright/test';
import type { BrowserContext, Page } from '@playwright/test';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

import { claimStack } from '#~/stack/claim-stack';

import { buildFlowHudScript } from './flow-hud';
import { parseRecordingOptions } from './recording-options';
import type { iRecordingOptions } from './recording-options';

/** The TanStack devtools button, hidden in recordings. */
const DEVTOOLS_TEST_IDENTIFIER = 'tanstack_devtools';
const ACTION_SLOW_MOTION_MS = 120;
const SETTLE_MS = 900;
const NETWORK_IDLE_TIMEOUT_MS = 10_000;
const WAIT_FOR_SELECTOR_TIMEOUT_MS = 20_000;

// Vite re-optimizes dependencies the first time a lazily loaded route opens, which fails that load once with
// "Failed to fetch dynamically imported module". Reloading picks up the re-optimized bundle.
const STALE_DEPENDENCY_ERROR_PATTERN = /dynamically imported module|Outdated Optimize Dep/u;

const execFileAsync = promisify(execFile);

interface iFlowTools {
  pause: (milliseconds: number) => Promise<unknown>;
  /** Saves a PNG of the current page next to the recording. */
  screenshot: (name: string) => Promise<unknown>;
}

interface iFlowModule {
  runFlow: (page: Page, flowTools: iFlowTools) => Promise<unknown>;
}

async function loadFlowModule(flowPath: string): Promise<iFlowModule> {
  const flowModule: unknown = await import(pathToFileURL(flowPath).href);
  const runFlow: unknown =
    typeof flowModule === 'object' && flowModule !== null ? Reflect.get(flowModule, 'runFlow') : null;
  if (typeof runFlow !== 'function') throw new Error(`${flowPath} must export an async runFlow(page, tools) function`);
  return {
    runFlow: async (page, flowTools) => {
      const result: unknown = await Reflect.apply(runFlow, undefined, [page, flowTools]);
      return result;
    },
  };
}

async function convertRecording(webmPath: string, outputBasePath: string) {
  await mkdir(path.dirname(outputBasePath), { recursive: true });
  await execFileAsync('ffmpeg', [
    '-y',
    '-loglevel',
    'error',
    '-i',
    webmPath,
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    `${outputBasePath}.mp4`,
  ]);
}

async function createRecordingContext(options: iRecordingOptions, baseUrl: string, recordingDirectory: string) {
  const browser = await chromium.launch({ headless: true, slowMo: ACTION_SLOW_MOTION_MS });
  const context = await browser.newContext({
    baseURL: baseUrl,
    viewport: options.viewport,
    colorScheme: options.colorScheme,
    reducedMotion: 'no-preference',
    storageState: options.storageStatePath ?? undefined,
    recordVideo: { dir: recordingDirectory, size: options.viewport },
  });
  // An app that keeps its theme in a cookie ignores the browser's color scheme.
  if (options.themeCookie !== null) await context.addCookies([{ ...options.themeCookie, url: baseUrl }]);
  await context.addInitScript({ content: buildFlowHudScript(DEVTOOLS_TEST_IDENTIFIER) });
  return { browser, context };
}

async function settle(page: Page) {
  await page.waitForLoadState('networkidle', { timeout: NETWORK_IDLE_TIMEOUT_MS }).catch(() => undefined);
}

async function openApp(page: Page, options: iRecordingOptions, baseUrl: string) {
  const loadErrors: string[] = [];
  const recordLoadError = (error: Error) => loadErrors.push(error.message);
  page.on('pageerror', recordLoadError);
  await page.goto(new URL(options.appPath, baseUrl).href);
  await settle(page);
  page.off('pageerror', recordLoadError);
  const pageText = await page
    .locator('body')
    .innerText()
    .catch(() => '');
  if ([...loadErrors, pageText].some((text) => STALE_DEPENDENCY_ERROR_PATTERN.test(text))) {
    await page.reload();
    await settle(page);
  }
  if (options.waitForSelector !== null) {
    await page.locator(options.waitForSelector).first().waitFor({ timeout: WAIT_FOR_SELECTOR_TIMEOUT_MS });
  }
  await page.waitForTimeout(SETTLE_MS);
}

async function recordPage(context: BrowserContext, options: iRecordingOptions, baseUrl: string) {
  const flowModule = await loadFlowModule(options.flowPath);
  const page = await context.newPage();
  await openApp(page, options, baseUrl);
  await flowModule.runFlow(page, {
    pause: async (milliseconds) => page.waitForTimeout(milliseconds),
    screenshot: async (name) =>
      page.screenshot({ path: path.join(path.dirname(options.outputBasePath), `${name}.png`) }),
  });
  await page.waitForTimeout(SETTLE_MS);
  const recordedVideo = page.video();
  await context.close();
  if (recordedVideo === null) throw new Error('The browser context recorded no video.');
  return recordedVideo.path();
}

async function recordFlow(options: iRecordingOptions) {
  const baseUrl = options.baseUrl ?? (await claimStack()).webBaseUrl;
  const recordingDirectory = await mkdtemp(path.join(tmpdir(), 'flow-recording-'));
  const { browser, context } = await createRecordingContext(options, baseUrl, recordingDirectory);
  try {
    await convertRecording(await recordPage(context, options, baseUrl), options.outputBasePath);
    console.log(`recorded ${options.outputBasePath}.mp4`);
  } finally {
    await browser.close();
    // Windows can hold the video file briefly after the browser closes; a leftover temp folder is harmless.
    await rm(recordingDirectory, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
  }
}

// pnpm runs the script inside this workspace and keeps the directory the command was typed in as INIT_CWD.
await recordFlow(parseRecordingOptions(process.argv.slice(2), process.env.INIT_CWD ?? process.cwd()));
