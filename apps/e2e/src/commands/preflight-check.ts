/**
 * Checks that this machine can run the E2E stack: dependencies, the Playwright browser, Docker (when the stack has
 * compose services) and the ports of this checkout's slot. Run it before `pnpm run e2e` to diagnose a failing boot.
 */
import { chromium } from '@playwright/test';
import { execFile } from 'node:child_process';
import { access } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

import { isPortFree } from '#~/machine/free-port';
import { readRunningStack } from '#~/machine/running-stack-marker';
import { claimStack } from '#~/stack/claim-stack';
import { E2E_WORKSPACE_DIRECTORY, PROJECT_ROOT_DIRECTORY } from '#~/stack/stack-paths';

const execFileAsync = promisify(execFile);

interface iCheck {
  name: string;
  isPassing: () => Promise<boolean>;
  fix: string;
}

async function canRun(command: string, args: string[]) {
  return execFileAsync(command, args).then(
    () => true,
    () => false,
  );
}

async function exists(filePath: string) {
  return access(filePath).then(
    () => true,
    () => false,
  );
}

async function buildChecks(): Promise<iCheck[]> {
  const stack = await claimStack();
  const isStackRunning = (await readRunningStack()) !== null;
  console.log(`E2E stack slot ${stack.slot}: compose project ${stack.composeProjectName}, web ${stack.webBaseUrl}`);

  const dockerChecks: iCheck[] =
    stack.definition.services.length === 0
      ? []
      : [
          { name: 'Docker CLI', isPassing: async () => canRun('docker', ['--version']), fix: 'Install Docker.' },
          { name: 'Docker daemon', isPassing: async () => canRun('docker', ['info']), fix: 'Start Docker.' },
        ];
  const portChecks = [...stack.portMap.values()].map((port): iCheck => ({
    name: `Port ${port}`,
    isPassing: async () => isStackRunning || isPortFree(port),
    fix: `Stop what listens on port ${port}, or set E2E_STACK_SLOT to another slot.`,
  }));

  return [
    {
      name: 'Dependencies',
      isPassing: async () =>
        (
          await Promise.all(
            [PROJECT_ROOT_DIRECTORY, E2E_WORKSPACE_DIRECTORY].map(async (directory) =>
              exists(path.join(directory, 'node_modules')),
            ),
          )
        ).every(Boolean),
      fix: 'Run pnpm install.',
    },
    {
      name: 'Playwright Chromium',
      isPassing: async () => exists(chromium.executablePath()),
      fix: 'Run pnpm --filter=e2e exec playwright install chromium.',
    },
    ...dockerChecks,
    ...portChecks,
  ];
}

async function runChecks(checks: readonly iCheck[]) {
  let failedCount = 0;
  for (const check of checks) {
    const isPassing = await check.isPassing();
    console.log(isPassing ? `  ok    ${check.name}` : `  FAIL  ${check.name}: ${check.fix}`);
    if (!isPassing) failedCount += 1;
  }
  return failedCount;
}

const failedCount = await runChecks(await buildChecks());
console.log(failedCount === 0 ? 'All checks passed: pnpm run e2e' : `${failedCount} check(s) failed.`);
process.exitCode = failedCount === 0 ? 0 : 1;
