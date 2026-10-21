/** Stops this checkout's E2E stack: its servers, its compose project with its volumes, and its local state. */
import { rm } from 'node:fs/promises';

import { runCommand } from '#~/lib/run-command';
import { waitForProcessExit } from '#~/lib/wait-for';
import { readRunningStack } from '#~/machine/running-stack-marker';
import { claimStack } from '#~/stack/claim-stack';
import { buildComposeArguments, writeComposeFile } from '#~/stack/stack-compose';
import { PROJECT_ROOT_DIRECTORY, STACK_STATE_DIRECTORY } from '#~/stack/stack-paths';

const STACK_STOP_TIMEOUT_MS = 30_000;

const stack = await claimStack();
const runningStack = await readRunningStack();
if (runningStack !== null) {
  console.log(`[e2e-cleanup] Stopping the stack process ${runningStack.pid}`);
  process.kill(runningStack.pid, 'SIGTERM');
  // The stack stops its apps, then removes its own services.
  await waitForProcessExit(runningStack.pid, { timeoutMs: STACK_STOP_TIMEOUT_MS });
}

if (stack.definition.services.length > 0) {
  console.log(`[e2e-cleanup] Removing compose project ${stack.composeProjectName}`);
  await writeComposeFile(stack);
  await runCommand('docker', buildComposeArguments(stack, 'down', '--volumes', '--remove-orphans'), {
    cwd: PROJECT_ROOT_DIRECTORY,
  });
}
// The state of every slot this checkout used: compose files and local data.
await rm(STACK_STATE_DIRECTORY, { recursive: true, force: true });
