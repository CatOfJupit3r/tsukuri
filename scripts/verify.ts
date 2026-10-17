#!/usr/bin/env tsx
/**
 * Canonical verification command for agents and humans. This is the ONLY
 * command agents should run to check types, lint, or test - never invoke
 * `tsc`, `tsgo`, `oxlint`, `eslint`, or `vitest` directly, and never call
 * `pnpm run check-types` / `pnpm run lint` / `pnpm run test` directly either.
 *
 * Runs check-types, oxlint, ESLint (and optionally tests) as Node child
 * processes so the exit code is honest. Spawning pnpm from Node avoids the
 * Windows PowerShell 5.1 behaviour of wrapping native stderr as
 * `NativeCommandError`, which makes successful pnpm runs look like failures.
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

import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

interface iStepResult {
  name: string;
  passed: boolean;
  output: string;
  errorLines: string[];
}

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOG_FILE = path.join(ROOT_DIR, 'node_modules', '.cache', 'verify', 'last-run.log');
const WORKSPACE_ROOTS = ['apps', 'packages', 'configs'] as const;
const MAX_ERROR_LINES = 30;

const args = process.argv.slice(2);
const shouldRunTests = args.includes('--tests');

/** Every value of a repeatable `--name value` / `--name=value` flag. */
function readRepeatable(name: string): string[] {
  const values: string[] = [];
  args.forEach((arg, index) => {
    if (arg === name && args[index + 1] && !args[index + 1].startsWith('--')) values.push(args[index + 1]);
    if (arg.startsWith(`${name}=`)) values.push(arg.slice(name.length + 1));
  });
  return values;
}

function readFiles(): string[] {
  const flagIndex = args.findIndex((arg) => arg === '--files');
  if (flagIndex === -1) return [];
  const rest = args.slice(flagIndex + 1);
  const end = rest.findIndex((arg) => arg.startsWith('--'));
  return end === -1 ? rest : rest.slice(0, end);
}

const filters = readRepeatable('--filter');
const changedSince = readRepeatable('--changed-since').at(-1) ?? null;
const files = readFiles();

/** First two path segments (e.g. `apps/server`) for a file under a workspace root, or null. */
function packageDirFor(filePath: string): string | null {
  const normalized = filePath.split(path.sep).join('/');
  const segments = normalized.split('/');
  if (segments.length < 2) return null;
  if (!(WORKSPACE_ROOTS as readonly string[]).includes(segments[0])) return null;
  return `${segments[0]}/${segments[1]}`;
}

const fileGroups = new Map<string, string[]>();
for (const file of files) {
  const dir = packageDirFor(file);
  if (!dir) continue;
  const relativeToPackage = file.split(path.sep).join('/').slice(dir.length + 1);
  const existing = fileGroups.get(dir) ?? [];
  existing.push(relativeToPackage);
  fileGroups.set(dir, existing);
}

const packageDirs = [...fileGroups.keys()];

// --files scopes to the owning packages; otherwise --filter / --changed-since combine,
// and with neither the whole workspace runs.
function resolveScopeArgs(): string[] {
  if (files.length > 0) return packageDirs.map((dir) => `--filter=./${dir}`);

  const scoped = [
    ...filters.map((filter) => `--filter=${filter}`),
    ...(changedSince ? [`--filter=...[${changedSince}]`] : []),
  ];
  return scoped.length > 0 ? scoped : ['--recursive'];
}

const scopeArgs = resolveScopeArgs().join(' ');

// Lines worth surfacing verbatim: TS diagnostics, oxlint/ESLint rows, and vitest failures.
const ERROR_LINE_PATTERNS = [
  /error TS\d+/, // tsgo / tsc
  /\s(error|warning)\s{2,}/i, // ESLint stylish rows: "12:5  error  message  rule"
  /:\d+:\d+: (error|warning) /, // oxlint rows: "src/a.ts:1:2: error eslint(rule): message"
  /^\s*(FAIL|✗|×|❯.*✗)/, // vitest failure markers
  /\d+\s+failed/i, // vitest / test summaries
  /Error:/, // generic runtime failures from a step
];

function extractErrorLines(output: string): string[] {
  const seen = new Set<string>();
  const collected: string[] = [];

  for (const rawLine of output.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    if (!line.trim()) continue;
    if (!ERROR_LINE_PATTERNS.some((pattern) => pattern.test(line))) continue;
    if (seen.has(line)) continue;

    seen.add(line);
    collected.push(line.trim());
  }

  return collected;
}

function runCommand(name: string, command: string): Promise<iStepResult> {
  return new Promise((resolve) => {
    // A single shelled command string resolves the `pnpm` shim on Windows and
    // runs through cmd.exe, which does not wrap stderr the way PowerShell 5.1
    // does. Every argument here is workspace-controlled (package.json scopes,
    // repo-relative file paths, the --changed-since ref).
    const child = spawn(command, { shell: true, cwd: ROOT_DIR });

    let output = '';
    child.stdout.on('data', (chunk) => {
      output += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      output += chunk.toString();
    });

    child.on('error', (error) => {
      output += `\nError: failed to spawn step "${name}": ${error.message}`;
      resolve({ name, passed: false, output, errorLines: extractErrorLines(output) });
    });

    child.on('close', (code) => {
      resolve({ name, passed: code === 0, output, errorLines: extractErrorLines(output) });
    });
  });
}

function combine(name: string, results: iStepResult[]): iStepResult {
  return {
    name,
    passed: results.every((result) => result.passed),
    output: results.map((result) => result.output).join('\n'),
    errorLines: results.flatMap((result) => result.errorLines),
  };
}

/** Runs a package script, or a file-scoped command inside each owning package when --files is given. */
async function runLintStep(name: string, script: string, fileCommand: string): Promise<iStepResult> {
  if (files.length === 0) {
    return runCommand(name, `pnpm ${scopeArgs} --stream run ${script}`);
  }

  const results = await Promise.all(
    [...fileGroups.entries()].map(([dir, relativeFiles]) =>
      runCommand(name, `pnpm --filter=./${dir} exec ${fileCommand} ${relativeFiles.join(' ')}`),
    ),
  );
  return combine(name, results);
}

async function writeLog(results: iStepResult[]) {
  const sections = results.map(
    (result) => `===== ${result.name}: ${result.passed ? 'PASS' : 'FAIL'} =====\n${result.output}`,
  );
  await mkdir(path.dirname(LOG_FILE), { recursive: true });
  await writeFile(LOG_FILE, `${sections.join('\n\n')}\n`);
}

async function main() {
  if (files.length > 0 && packageDirs.length === 0) {
    console.log('=== verify summary ===');
    console.log('FAIL files');
    console.log('errors: 1');
    console.log('--- first errors ---');
    console.log(
      `Error: none of the --files paths resolved to a workspace package (expected apps/*, packages/*, or configs/*)`,
    );
    process.exit(1);
  }

  const results: iStepResult[] = [];

  results.push(await runCommand('check-types', `pnpm ${scopeArgs} --stream --no-bail run check-types`));
  results.push(await runLintStep('oxlint', 'lint:oxlint', 'oxlint'));
  results.push(
    await runLintStep(
      'eslint',
      'lint:eslint',
      'eslint --fix --cache --cache-location node_modules/.cache/eslint/',
    ),
  );

  if (shouldRunTests) {
    results.push(await runCommand('test', `pnpm ${scopeArgs} --stream run test`));
  }

  await writeLog(results);

  const totalErrorLines = results.reduce((sum, result) => sum + result.errorLines.length, 0);
  const allPassed = results.every((result) => result.passed);

  console.log('=== verify summary ===');
  for (const result of results) {
    console.log(`${result.passed ? 'PASS' : 'FAIL'} ${result.name}`);
  }
  console.log(`errors: ${totalErrorLines}`);
  console.log(`log: ${path.relative(ROOT_DIR, LOG_FILE)}`);

  if (!allPassed) {
    const errorLines = results.flatMap((result) => result.errorLines).slice(0, MAX_ERROR_LINES);
    console.log('--- first errors ---');
    for (const line of errorLines) {
      console.log(line);
    }
  }

  process.exit(allPassed ? 0 : 1);
}

main().catch((error) => {
  console.error('Error: verify script crashed:', error);
  process.exit(1);
});
