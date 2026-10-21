/**
 * Starts this checkout's E2E stack and keeps it running until it is stopped:
 * 1. claims a slot (its own ports, compose project and data folder) and refuses one this checkout already runs
 * 2. starts the slot's copy of the dev compose services from empty volumes
 * 3. resets the slot's data and applies the database migrations
 * 4. builds the web app and serves the build, starts every other app's dev server, all on the slot's ports, and
 *    waits until the web app answers
 * Stopping it (a signal, or Playwright at the end of a run) stops the apps, then removes the services and volumes.
 */
import { resetStackData } from '#~/data/reset-stack-data';
import { runCommand } from '#~/lib/run-command';
import { waitForPort, waitForUrl } from '#~/lib/wait-for';
import { isPortFree } from '#~/machine/free-port';
import { removeRunningStackMarker, writeRunningStackMarker } from '#~/machine/running-stack-marker';
import { StackBackgroundProcesses } from '#~/processes/stack-background-processes';
import { claimStack } from '#~/stack/claim-stack';
import type { iStack } from '#~/stack/claim-stack';
import { buildComposeArguments, writeComposeFile } from '#~/stack/stack-compose';
import type { iStackApp } from '#~/stack/stack-definition';
import { PROJECT_ROOT_DIRECTORY } from '#~/stack/stack-paths';
import { toSlotPort } from '#~/stack/stack-ports';
import { STACK_SLOT_ENV_NAME } from '#~/stack/stack-slot';

const APP_READY_TIMEOUT_MS = 180_000;

async function assertAppPortsAreFree(stack: iStack) {
  const takenPorts = (
    await Promise.all(stack.appPorts.map(async (port) => ((await isPortFree(port)) ? [] : [port])))
  ).flat();
  if (takenPorts.length > 0) {
    throw new Error(
      `Port ${takenPorts.join(', ')} of E2E stack slot ${stack.slot} is in use; this checkout's stack may already run. Stop it (pnpm run e2e:cleanup), or set ${STACK_SLOT_ENV_NAME} to another slot.`,
    );
  }
}

async function runCompose(stack: iStack, ...composeArguments: string[]) {
  await runCommand('docker', buildComposeArguments(stack, ...composeArguments), { cwd: PROJECT_ROOT_DIRECTORY });
}

/** Starts the slot's services from scratch; `--wait` returns once their health checks pass. */
async function startServices(stack: iStack) {
  if (stack.definition.services.length === 0) return;
  await writeComposeFile(stack);
  await runCompose(stack, 'down', '--volumes', '--remove-orphans');
  await runCompose(stack, 'up', '--detach', '--wait');
}

/** Removes the slot's services once its apps stopped, so they never lose their database mid-request. */
async function stopServices(stack: iStack) {
  await removeRunningStackMarker();
  if (stack.definition.services.length === 0) return;
  await runCompose(stack, 'down', '--volumes', '--remove-orphans').catch((error: unknown) => {
    console.error('[e2e-stack] Could not remove the compose project:', error);
  });
}

function appArguments(stack: iStack, app: iStackApp) {
  const filterArguments = [`--filter=${app.filter}`, 'run'];
  if (!app.isServedFromBuild) return [...filterArguments, 'dev'];
  return [...filterArguments, 'serve', '--port', String(toSlotPort(app.devPort, stack.slot)), '--strictPort'];
}

async function startApps(stack: iStack, backgroundProcesses: StackBackgroundProcesses) {
  for (const app of stack.definition.apps.filter(({ isServedFromBuild }) => isServedFromBuild)) {
    console.log(`[e2e-stack] Building ${app.filter}...`);
    await runCommand('pnpm', [`--filter=${app.filter}`, 'run', 'build'], {
      cwd: PROJECT_ROOT_DIRECTORY,
      env: stack.environment,
    });
  }
  backgroundProcesses.startAll(
    stack.definition.apps.map((app) => ({
      command: 'pnpm',
      args: appArguments(stack, app),
      cwd: PROJECT_ROOT_DIRECTORY,
      env: stack.environment,
    })),
  );
  const waitOptions = { timeoutMs: APP_READY_TIMEOUT_MS, signal: backgroundProcesses.stopSignal };
  await Promise.all(stack.appPorts.map(async (port) => waitForPort(port, waitOptions)));
  await waitForUrl(stack.webBaseUrl, waitOptions);
}

const stack = await claimStack();
console.log(`[e2e-stack] Slot ${stack.slot}: compose project ${stack.composeProjectName}, web ${stack.webBaseUrl}`);
await assertAppPortsAreFree(stack);
await writeRunningStackMarker(stack.slot);
const backgroundProcesses = new StackBackgroundProcesses(async () => stopServices(stack));

try {
  await startServices(stack);
  await resetStackData(stack);
  await startApps(stack, backgroundProcesses);
  console.log(`[e2e-stack] Ready at ${stack.webBaseUrl}`);
} catch (error) {
  console.error('[e2e-stack] Stack startup failed:', error);
  process.exitCode = 1;
  backgroundProcesses.stopAll();
}
