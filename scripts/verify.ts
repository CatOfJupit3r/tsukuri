#!/usr/bin/env tsx
/**
 * Canonical verification command for agents and humans. This is the ONLY
 * command agents should run to check types, lint, or test - never invoke
 * `tsc`, `tsgo`, `oxlint`, `eslint`, or `vitest` directly, and never call
 * `pnpm run check-types` / `pnpm run lint` / `pnpm run test` directly either.
 *
 * Runs check-types, oxlint, ESLint (and optionally tests) as Node child
 * processes so the exit code is honest. The console receives a compact summary,
 * the detected diagnostics and the tail of the log.
 *
 * Usage:
 *   pnpm run verify                                    # check-types + oxlint + eslint across the workspace
 *   pnpm run verify --tests                            # also run the test suite
 *   pnpm run verify --filter web --filter server       # scope every step to these packages (repeatable)
 *   pnpm run verify --changed-since origin/main        # scope to packages changed since a ref, plus their dependents
 *   pnpm run verify --files apps/server/src/foo.ts ...  # lint exactly these files; scope
 *                                                       # check-types (and tests) to the packages that own them
 *
 * The full output of every step is written to `node_modules/.cache/verify/last-run.log`
 * in this checkout, so parallel checkouts (worktrees) never overwrite each other's log.
 */

import { execFileSync, spawn } from 'node:child_process';
import { createWriteStream, existsSync, mkdirSync } from 'node:fs';
import type { WriteStream } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { finished } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

interface iStepResult {
  name: string;
  passed: boolean;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  durationMs: number;
  outputLineCount: number;
  diagnosticLines: string[];
}

interface iVerifyStep {
  name: string;
  args: string[];
}

interface iVerifyScope {
  /** pnpm selector arguments shared by every package-scoped step. */
  scopeArgs: string[];
  description: string;
  shouldUseLintCache: boolean;
}

interface iPnpmInvocation {
  command: string;
  args: string[];
  shell: boolean;
}

interface iPnpmWorkspaceListing {
  path: string;
}

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOG_FILE = path.join(ROOT_DIR, 'node_modules', '.cache', 'verify', 'last-run.log');
const WORKSPACE_ROOTS = ['apps', 'packages', 'configs'];
const LOG_EXCERPT_LINES = 100;
const MAX_DIAGNOSTIC_LINES = 30;
const SUMMARY_MARKER = '=== verify final summary ===';
const DOCUMENTATION_FILE_PATTERN = /\.md$/i;
/** Each linted workspace has one, and the root one combines them. */
const OXLINT_CONFIG_FILE_NAME = 'oxlint.config.mjs';
const ESLINT_CACHE_ARGS = ['--cache', '--cache-strategy', 'content', '--cache-location', 'node_modules/.cache/eslint/'];
/** None of the steps read another workspace's build output, so dependency order would only serialize them. */
const NO_SORT_ARG = '--no-sort';

const DIAGNOSTIC_LINE_PATTERNS = [
  /error TS\d+/, // tsgo / tsc
  /\s(error|warning)\s{2,}/i, // ESLint stylish rows: "12:5  error  message  rule"
  /^\s*[×!]\s/, // oxlint rows
  /:\d+:\d+: (error|warning) /, // oxlint rows without a terminal: "path:12:5: error rule(name): message"
  /^\s*(FAIL|✗|×|❯.*✗)/, // vitest failure markers
  /\d+\s+failed/i, // vitest / test summaries
  /Error:/, // generic runtime failures from a step
];

// eslint-disable-next-line no-control-regex
const ANSI_ESCAPE_PATTERN = /\u001B\[[0-?]*[ -/]*[@-~]/g;

const args = process.argv.slice(2);
const shouldRunTests = args.includes('--tests');

/** Every value of a repeatable `--name value` / `--name=value` flag. */
function readRepeatable(name: string) {
  const values: string[] = [];
  args.forEach((arg, index) => {
    const next = args[index + 1];
    if (arg === name) {
      if (!next || next.startsWith('--')) throw new Error(`Expected a value after "${name}".`);
      values.push(next);
    }
    if (arg.startsWith(`${name}=`)) values.push(arg.slice(name.length + 1));
  });
  return values;
}

function readFiles() {
  const flagIndex = args.indexOf('--files');
  if (flagIndex === -1) return [];
  const rest = args.slice(flagIndex + 1);
  const end = rest.findIndex((arg) => arg.startsWith('--'));
  return (end === -1 ? rest : rest.slice(0, end)).map((file) => file.split(path.sep).join('/'));
}

function splitLines(output: string) {
  const lines = output.split(/\r\n|\n|\r/);
  if (lines.at(-1) === '') lines.pop();
  return lines;
}

/** First two path segments (e.g. `apps/server`) for a file under a workspace root, or null. */
function packageDirFor(filePath: string) {
  const segments = filePath.split('/');
  if (segments.length < 2 || !WORKSPACE_ROOTS.includes(segments[0])) return null;
  return `${segments[0]}/${segments[1]}`;
}

function groupFilesByPackage(files: string[]) {
  const groups = new Map<string, string[]>();
  for (const file of files) {
    const dir = packageDirFor(file);
    if (!dir) continue;
    groups.set(dir, [...(groups.get(dir) ?? []), file.slice(dir.length + 1)]);
  }
  return groups;
}

function listChangedFiles(changedSinceRef: string) {
  const readGitFileList = (gitArgs: string[]) =>
    splitLines(execFileSync('git', gitArgs, { cwd: ROOT_DIR, encoding: 'utf8' }));

  return [
    ...readGitFileList(['diff', '--name-only', changedSinceRef]),
    ...readGitFileList(['ls-files', '--others', '--exclude-standard']),
  ];
}

function isInsideWorkspace(filePath: string) {
  for (let folder = path.dirname(filePath); folder !== '.'; folder = path.dirname(folder)) {
    if (existsSync(path.join(ROOT_DIR, folder, 'package.json'))) return true;
  }
  return false;
}

/**
 * Root files such as tsconfig.base.json or this script belong to no workspace,
 * so pnpm's changed-package selection would skip what they affect.
 */
function findChangedFileOutsideWorkspaces(changedSinceRef: string) {
  return listChangedFiles(changedSinceRef).find(
    (filePath) => !DOCUMENTATION_FILE_PATTERN.test(filePath) && !isInsideWorkspace(filePath),
  );
}

/**
 * The root workspace's own scripts recurse into every workspace, so a filter
 * that selects it would run each step twice.
 */
async function readRootWorkspaceName() {
  const rootManifest: { name: string } = JSON.parse(await readFile(path.join(ROOT_DIR, 'package.json'), 'utf8'));
  return rootManifest.name;
}

/**
 * `--files` scopes to the owning packages; otherwise `--filter` and `--changed-since` combine,
 * and with neither the whole workspace runs. Scoped runs are the iteration path, so their lint
 * keeps ESLint's cache. A full run lints uncached: the cache cannot see type changes in imported files.
 */
async function readScope(fileGroups: Map<string, string[]>, files: string[]): Promise<iVerifyScope> {
  if (files.length > 0) {
    const dirs = [...fileGroups.keys()];
    return {
      scopeArgs: dirs.map((dir) => `--filter=./${dir}`),
      description: `files in ${dirs.join(', ')}`,
      shouldUseLintCache: true,
    };
  }

  const filters = readRepeatable('--filter');
  const changedSinceRef = readRepeatable('--changed-since').at(-1) ?? null;
  const fileOutsideWorkspaces = changedSinceRef ? findChangedFileOutsideWorkspaces(changedSinceRef) : undefined;

  if (fileOutsideWorkspaces) {
    console.log(`[verify] ${fileOutsideWorkspaces} changed outside every workspace; checking the whole workspace.`);
    return { scopeArgs: ['--recursive'], description: 'workspace', shouldUseLintCache: true };
  }

  const selectors = [...filters, ...(changedSinceRef ? [`...[${changedSinceRef}]`] : [])];
  if (selectors.length === 0) return { scopeArgs: ['--recursive'], description: 'workspace', shouldUseLintCache: false };

  return {
    scopeArgs: [...selectors.map((selector) => `--filter=${selector}`), `--filter=!${await readRootWorkspaceName()}`],
    description: selectors.join(' '),
    shouldUseLintCache: true,
  };
}

function createPnpmInvocation(pnpmArgs: string[]): iPnpmInvocation {
  /**
   * During `pnpm run verify`, npm_execpath points to pnpm's JavaScript
   * entrypoint. Calling that file with the current Node executable avoids
   * PowerShell's NativeCommandError behaviour, cmd.exe argument interpolation
   * and Node's shell+args DEP0190 warning.
   */
  const pnpmCliPath = process.env.npm_execpath;
  if (pnpmCliPath && /^pnpm\.[cm]?js$/i.test(path.basename(pnpmCliPath))) {
    return { command: process.execPath, args: [pnpmCliPath, ...pnpmArgs], shell: false };
  }

  if (process.platform !== 'win32') return { command: 'pnpm', args: pnpmArgs, shell: false };

  /**
   * Direct Windows execution does not necessarily expose npm_execpath, and
   * pnpm.cmd requires a shell. Reject shell metacharacters because selectors
   * and file paths are provided by the caller.
   */
  // cmd.exe only expands "!" under delayed expansion, which a spawned shell leaves off.
  const unsafeArg = pnpmArgs.find((arg) => !/^[\w@./:=,*{}[\]~+!-]+$/.test(arg));
  if (unsafeArg) {
    throw new Error(
      `Cannot safely pass ${JSON.stringify(unsafeArg)} through the Windows shell fallback. Run it through \`pnpm run verify\` instead.`,
    );
  }

  return { command: `pnpm ${pnpmArgs.join(' ')}`, args: [], shell: true };
}

/** The selected workspaces that have an oxlint config, relative to the root, for the one root oxlint run. */
function listLintedWorkspaceDirectories(scopeArgs: string[]) {
  const invocation = createPnpmInvocation([...scopeArgs, 'list', '--depth', '-1', '--json']);
  const listing: iPnpmWorkspaceListing[] = JSON.parse(
    execFileSync(invocation.command, invocation.args, {
      cwd: ROOT_DIR,
      encoding: 'utf8',
      shell: invocation.shell,
      windowsHide: true,
    }),
  );

  return listing
    .map((workspace) => path.relative(ROOT_DIR, workspace.path).replaceAll('\\', '/'))
    .filter((directory) => directory !== '' && existsSync(path.join(ROOT_DIR, directory, OXLINT_CONFIG_FILE_NAME)));
}

function extractDiagnosticLines(output: string) {
  const seen = new Set<string>();
  const diagnostics: string[] = [];

  for (const rawLine of splitLines(output)) {
    const line = rawLine.replace(ANSI_ESCAPE_PATTERN, '').trim();
    if (!line || seen.has(line)) continue;
    if (!DIAGNOSTIC_LINE_PATTERNS.some((pattern) => pattern.test(line))) continue;

    seen.add(line);
    diagnostics.push(line);
  }

  return diagnostics;
}

function formatDuration(durationMs: number) {
  return durationMs < 1_000 ? `${Math.round(durationMs)}ms` : `${(durationMs / 1_000).toFixed(2)}s`;
}

function runStep(name: string, pnpmArgs: string[], log: WriteStream) {
  return new Promise<iStepResult>((resolve) => {
    const displayCommand = `pnpm ${pnpmArgs.join(' ')}`;
    const invocation = createPnpmInvocation(pnpmArgs);
    const startedAt = performance.now();

    // Steps of one stage run concurrently, so each step's output reaches the log as one block when it ends.
    let output = '';
    let hasSettled = false;

    const header = [
      '',
      '='.repeat(80),
      `step: ${name}`,
      `started: ${new Date().toISOString()}`,
      `command: ${displayCommand}`,
      '-'.repeat(80),
      '',
    ].join('\n');

    console.log(`[verify] RUN  ${name} - ${displayCommand}`);

    const child = spawn(invocation.command, invocation.args, {
      cwd: ROOT_DIR,
      shell: invocation.shell,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    const recordOutput = (chunk: Buffer) => {
      output += chunk.toString();
    };
    child.stdout.on('data', recordOutput);
    child.stderr.on('data', recordOutput);

    const complete = (exitCode: number | null, signal: NodeJS.Signals | null, spawnError?: Error) => {
      // Both "error" and "close" can fire for one child.
      if (hasSettled) return;
      hasSettled = true;

      if (spawnError) output += `\nError: failed to spawn step "${name}": ${spawnError.message}\n`;

      const durationMs = performance.now() - startedAt;
      const diagnosticLines = extractDiagnosticLines(output);
      const outputLineCount = splitLines(output).length;
      const passed = !spawnError && exitCode === 0;

      log.write(
        [
          header,
          output,
          '',
          '-'.repeat(80),
          `result: ${passed ? 'PASS' : 'FAIL'}`,
          `exit-code: ${exitCode ?? 'none'}`,
          `signal: ${signal ?? 'none'}`,
          `duration: ${formatDuration(durationMs)}`,
          `output-lines: ${outputLineCount}`,
          `detected-diagnostics: ${diagnosticLines.length}`,
          '='.repeat(80),
          '',
        ].join('\n'),
      );

      let exitDescription = `exit ${exitCode ?? 'none'}`;
      if (spawnError) exitDescription = 'spawn error';
      else if (signal) exitDescription = `signal ${signal}`;

      console.log(
        `[verify] ${passed ? 'PASS' : 'FAIL'} ${name} (${formatDuration(durationMs)}, ${exitDescription}, ` +
          `${outputLineCount} lines, ${diagnosticLines.length} diagnostics)`,
      );

      resolve({ name, passed, exitCode, signal, durationMs, outputLineCount, diagnosticLines });
    };

    child.once('error', (error) => complete(null, null, error));
    child.once('close', (exitCode, signal) => complete(exitCode, signal));
  });
}

/** One root oxlint run loads the shared lint config once for every selected workspace. */
function createOxlintStep(targets: string[]): iVerifyStep[] {
  if (targets.length === 0) return [];
  return [{ name: 'oxlint', args: ['exec', 'oxlint', '-c', OXLINT_CONFIG_FILE_NAME, '--fix', ...targets] }];
}

function createEslintSteps(scope: iVerifyScope, fileGroups: Map<string, string[]>): iVerifyStep[] {
  const cacheArgs = scope.shouldUseLintCache ? ESLINT_CACHE_ARGS : [];
  if (fileGroups.size === 0) {
    return [{ name: 'eslint', args: [...scope.scopeArgs, NO_SORT_ARG, '--stream', 'run', 'lint:eslint', ...cacheArgs] }];
  }

  return [...fileGroups.entries()].map(([dir, relativeFiles]) => ({
    name: `eslint ${dir}`,
    args: [`--filter=./${dir}`, 'exec', 'eslint', '--fix', '--no-warn-ignored', ...cacheArgs, ...relativeFiles],
  }));
}

function buildStages(scope: iVerifyScope, fileGroups: Map<string, string[]>, files: string[]) {
  const oxlintTargets =
    files.length > 0
      ? files.filter((file) => {
          const dir = packageDirFor(file);
          return dir !== null && existsSync(path.join(ROOT_DIR, dir, OXLINT_CONFIG_FILE_NAME));
        })
      : listLintedWorkspaceDirectories(scope.scopeArgs);

  // Steps of one stage run concurrently; stages run in order.
  const stages: iVerifyStep[][] = [
    [{ name: 'check-types', args: [...scope.scopeArgs, NO_SORT_ARG, '--stream', '--no-bail', 'run', 'check-types'] }],
    [...createOxlintStep(oxlintTargets), ...createEslintSteps(scope, fileGroups)],
  ];

  if (shouldRunTests) {
    stages.push([{ name: 'test', args: [...scope.scopeArgs, NO_SORT_ARG, '--stream', 'run', 'test'] }]);
  }

  return stages;
}

function isRunPassing(results: iStepResult[], expectedStepCount: number, fatalError: string | null) {
  return fatalError === null && results.length === expectedStepCount && results.every((result) => result.passed);
}

function buildSummary(
  results: iStepResult[],
  expectedStepCount: number,
  scopeDescription: string,
  durationMs: number,
  fatalError: string | null,
) {
  const passedCount = results.filter((result) => result.passed).length;
  const failedCount = results.length - passedCount;
  const notRunCount = expectedStepCount - results.length;
  const diagnosticCount = results.reduce((sum, result) => sum + result.diagnosticLines.length, 0);
  const nameWidth = Math.max('step'.length, ...results.map((result) => result.name.length));

  const lines = [
    SUMMARY_MARKER,
    `status: ${isRunPassing(results, expectedStepCount, fatalError) ? 'PASS' : 'FAIL'}`,
    `scope: ${scopeDescription}`,
    `tests: ${shouldRunTests ? 'included' : 'skipped'}`,
    `steps: ${passedCount} passed, ${failedCount} failed, ${notRunCount} not run, ${expectedStepCount} total`,
    `duration: ${formatDuration(durationMs)}`,
    `detected-diagnostics: ${diagnosticCount}`,
    `full-log: ${path.relative(ROOT_DIR, LOG_FILE)}`,
    '',
  ];

  for (const result of results) {
    const exit = result.signal ?? result.exitCode ?? 'none';
    lines.push(
      `${result.passed ? 'PASS' : 'FAIL'}  ${result.name.padEnd(nameWidth)}  ` +
        `${formatDuration(result.durationMs).padStart(8)}  exit=${String(exit).padEnd(8)}  ` +
        `lines=${String(result.outputLineCount).padStart(5)}  diagnostics=${result.diagnosticLines.length}`,
    );
  }

  if (fatalError) lines.push('', 'fatal-error:', fatalError);

  return lines.join('\n');
}

function printDiagnostics(results: iStepResult[]) {
  const failedResults = results.filter((result) => !result.passed);
  if (failedResults.length === 0) return;

  const diagnostics = failedResults.flatMap((result) => result.diagnosticLines.map((line) => `[${result.name}] ${line}`));

  console.log('--- detected diagnostics ---');
  if (diagnostics.length === 0) {
    console.log('No known diagnostic pattern matched; inspect the full log for the failure.');
    return;
  }

  for (const line of diagnostics.slice(0, MAX_DIAGNOSTIC_LINES)) console.log(line);
  if (diagnostics.length > MAX_DIAGNOSTIC_LINES) {
    console.log(`... ${diagnostics.length - MAX_DIAGNOSTIC_LINES} more diagnostic lines are in the full log.`);
  }
}

async function printLogExcerpt() {
  const allLines = splitLines(await readFile(LOG_FILE, 'utf8'));

  // The final summary is printed separately, so the excerpt leaves it out.
  const summaryIndex = allLines.lastIndexOf(SUMMARY_MARKER);
  const executionLines = summaryIndex === -1 ? allLines : allLines.slice(0, summaryIndex);
  const shownLines = executionLines.slice(-LOG_EXCERPT_LINES);
  const isTruncated = executionLines.length > LOG_EXCERPT_LINES;

  console.log(
    isTruncated
      ? `--- log tail: last ${shownLines.length} of ${executionLines.length} lines ---`
      : `--- complete execution log: ${executionLines.length} lines ---`,
  );
  for (const line of shownLines) console.log(line);
  console.log('--- end log excerpt ---');

  if (isTruncated) {
    console.log(`[verify] ${executionLines.length - shownLines.length} earlier lines were omitted from the console.`);
    console.log(`[verify] AGENT: read the complete checks before rerunning them: ${path.relative(ROOT_DIR, LOG_FILE)}`);
  }
}

function describeError(error: unknown) {
  return error instanceof Error ? (error.stack ?? error.message) : String(error);
}

async function main() {
  const startedAt = performance.now();
  const files = readFiles();
  const fileGroups = groupFilesByPackage(files);

  if (files.length > 0 && fileGroups.size === 0) {
    throw new Error('None of the --files paths resolved to a workspace package (expected apps/*, packages/*, or configs/*).');
  }

  const scope = await readScope(fileGroups, files);
  const stages = buildStages(scope, fileGroups, files);
  const expectedStepCount = stages.flat().length;

  mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  const log = createWriteStream(LOG_FILE, { flags: 'w', encoding: 'utf8' });
  const logFinished = finished(log);

  const results: iStepResult[] = [];
  let fatalError: string | null = null;

  log.write(
    [
      '=== verify run ===',
      `started: ${new Date().toISOString()}`,
      `cwd: ${ROOT_DIR}`,
      `scope: ${scope.description}`,
      `tests: ${shouldRunTests ? 'included' : 'skipped'}`,
      '',
    ].join('\n'),
  );

  try {
    for (const stage of stages) {
      results.push(...(await Promise.all(stage.map((step) => runStep(step.name, step.args, log)))));
    }
  } catch (error) {
    fatalError = describeError(error);
    log.write(`\nError: verify script crashed:\n${fatalError}\n`);
  }

  const summary = buildSummary(results, expectedStepCount, scope.description, performance.now() - startedAt, fatalError);

  log.write(`\n${summary}\n`);
  log.end();
  await logFinished;

  console.log('');
  console.log(summary);
  printDiagnostics(results);
  await printLogExcerpt();

  // process.exit() could truncate pending output.
  process.exitCode = isRunPassing(results, expectedStepCount, fatalError) ? 0 : 1;
}

main().catch((error: unknown) => {
  console.error('Error: verify script crashed:', describeError(error));
  console.error(`[verify] Log path: ${path.relative(ROOT_DIR, LOG_FILE)}`);
  process.exitCode = 1;
});
