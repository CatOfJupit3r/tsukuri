/**
 * Starts this checkout's E2E stack and keeps it running until it is stopped:
 * 1. claims a slot (its own ports, compose project and data folder), locks it and refuses a second stack of this
 *    checkout
 * 2. starts the slot's copy of the dev compose services from empty volumes
 * 3. resets the slot's data and applies the database migrations
 * 4. builds and serves the web app, starts every other app's dev server, all on the slot's ports, and waits until
 *    the web app answers
 * Stopping it (a signal, or Playwright at the end of a run) stops the apps, then removes the services and volumes.
 */
import { StackBackgroundProcesses } from '#~/processes/stack-background-processes';
import { bootStack } from '#~/runner/boot-stack';
import { createMachineBootSteps } from '#~/runner/machine-boot-steps';
import { claimStack } from '#~/stack/claim-stack';

const stack = await claimStack();
console.log(`[e2e-stack] Slot ${stack.slot}: compose project ${stack.composeProjectName}, web ${stack.webBaseUrl}`);

try {
  await bootStack(createMachineBootSteps(stack), (onStop) => {
    const processes = new StackBackgroundProcesses({ onStop, shouldWatchOrphans: true });
    processes.stopOnProcessSignals();
    return processes;
  });
  console.log(`[e2e-stack] Ready at ${stack.webBaseUrl}`);
} catch (error) {
  console.error('[e2e-stack] Stack startup failed:', error);
  process.exitCode = 1;
}
