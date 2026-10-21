/** Stops this checkout's E2E stack: its servers, its compose project with its volumes, and its local state. */
import { rm } from 'node:fs/promises';

import { runCommand } from '#~/lib/run-command';
import { waitForProcessExit } from '#~/lib/wait-for';
import { readRunningStack } from '#~/machine/running-stack-marker';
import { stopRunningStack } from '#~/runner/stop-running-stack';
import { claimStack } from '#~/stack/claim-stack';
import { buildComposeArguments, writeComposeFile } from '#~/stack/stack-compose';
import { PROJECT_ROOT_DIRECTORY, STACK_STATE_DIRECTORY } from '#~/stack/stack-paths';

const STACK_STOP_TIMEOUT_MS = 30_000;

const stack = await claimStack();

await stopRunningStack({
  readRunningStackPid: async () => (await readRunningStack())?.pid ?? null,
  signalProcess: (pid, signal) => process.kill(pid, signal),
  waitForExit: async (pid) => waitForProcessExit(pid, { timeoutMs: STACK_STOP_TIMEOUT_MS }),
  removeServices: async () => {
    if (stack.definition.services.length === 0) return;
    console.log(`[e2e-cleanup] Removing compose project ${stack.composeProjectName}`);
    await writeComposeFile(stack);
    await runCommand('docker', buildComposeArguments(stack, 'down', '--volumes', '--remove-orphans'), {
      cwd: PROJECT_ROOT_DIRECTORY,
    });
  },
  // The state of every slot this checkout used: compose files and local data.
  removeState: async () => rm(STACK_STATE_DIRECTORY, { recursive: true, force: true }),
});
