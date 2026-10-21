import { resetStackData } from '#~/data/reset-stack-data';
import { runCommand } from '#~/lib/run-command';
import { waitForPort, waitForUrl } from '#~/lib/wait-for';
import { isPortFree } from '#~/machine/free-port';
import { readRunningStack, removeRunningStackMarker, writeRunningStackMarker } from '#~/machine/running-stack-marker';
import { acquireSlotLock } from '#~/machine/slot-lock';
import type { iStack } from '#~/stack/claim-stack';
import { buildComposeArguments, writeComposeFile } from '#~/stack/stack-compose';
import type { iStackApp } from '#~/stack/stack-definition';
import { PROJECT_ROOT_DIRECTORY } from '#~/stack/stack-paths';
import { toSlotPort } from '#~/stack/stack-ports';
import { STACK_SLOT_ENV_NAME } from '#~/stack/stack-slot';

import type { iStackBootSteps } from './boot-stack';

const APP_READY_TIMEOUT_MS = 180_000;
/** A production build, whatever NODE_ENV the dev configuration sets. */
const BUILD_NODE_ENV = 'production';

/** The slot's own build output, inside the app's node_modules so the built server still resolves its packages. */
function buildOutDir(stack: iStack) {
  return `node_modules/.cache/e2e-stack/slot-${stack.slot}`;
}

async function assertAppPortsAreFree(stack: iStack) {
  const takenPorts = (
    await Promise.all(stack.appPorts.map(async (port) => ((await isPortFree(port)) ? [] : [port])))
  ).flat();
  if (takenPorts.length > 0) {
    throw new Error(
      `Port ${takenPorts.join(', ')} of E2E stack slot ${stack.slot} is in use. Stop what listens there, or set ${STACK_SLOT_ENV_NAME} to another slot.`,
    );
  }
}

async function runCompose(stack: iStack, composeArguments: string[], signal?: AbortSignal) {
  await runCommand('docker', buildComposeArguments(stack, ...composeArguments), {
    cwd: PROJECT_ROOT_DIRECTORY,
    signal,
  });
}

/** Starts the slot's services from scratch; `--wait` returns once their health checks pass. */
async function startServices(stack: iStack, signal: AbortSignal) {
  if (stack.definition.services.length === 0) return;
  await writeComposeFile(stack);
  await runCompose(stack, ['down', '--volumes', '--remove-orphans'], signal);
  await runCompose(stack, ['up', '--detach', '--wait'], signal);
}

async function stopServices(stack: iStack) {
  if (stack.definition.services.length === 0) return;
  await runCompose(stack, ['down', '--volumes', '--remove-orphans']).catch((error: unknown) => {
    console.error('[e2e-stack] Could not remove the compose project:', error);
  });
}

async function buildApps(stack: iStack, signal: AbortSignal) {
  for (const app of stack.definition.apps.filter(({ isServedFromBuild }) => isServedFromBuild)) {
    console.log(`[e2e-stack] Building ${app.filter}...`);
    await runCommand('pnpm', [`--filter=${app.filter}`, 'run', 'build', '--outDir', buildOutDir(stack)], {
      cwd: PROJECT_ROOT_DIRECTORY,
      env: { ...stack.environment, NODE_ENV: BUILD_NODE_ENV },
      signal,
    });
  }
}

function appArguments(stack: iStack, app: iStackApp) {
  const filterArguments = [`--filter=${app.filter}`, 'run'];
  if (!app.isServedFromBuild) return [...filterArguments, 'dev'];
  const port = String(toSlotPort(app.devPort, stack.slot));
  return [...filterArguments, 'serve', '--outDir', buildOutDir(stack), '--port', port, '--strictPort'];
}

async function waitForApps(stack: iStack, signal: AbortSignal) {
  const waitOptions = { timeoutMs: APP_READY_TIMEOUT_MS, signal };
  await Promise.all(stack.appPorts.map(async (port) => waitForPort(port, waitOptions)));
  await waitForUrl(stack.webBaseUrl, waitOptions);
}

/** Boots `stack` on this machine: Docker for the services, pnpm scripts for the data and the apps. */
export function createMachineBootSteps(stack: iStack): iStackBootSteps {
  return {
    readRunningStackPid: async () => (await readRunningStack())?.pid ?? null,
    assertAppPortsAreFree: async () => assertAppPortsAreFree(stack),
    acquireSlotLock: async () => acquireSlotLock(stack.slot),
    writeRunningMarker: async () => writeRunningStackMarker(stack.slot),
    removeRunningMarker: removeRunningStackMarker,
    startServices: async (signal) => startServices(stack, signal),
    stopServices: async () => stopServices(stack),
    resetData: async (signal) => resetStackData(stack, signal),
    buildApps: async (signal) => buildApps(stack, signal),
    appCommands: stack.definition.apps.map((app) => ({
      command: 'pnpm',
      args: appArguments(stack, app),
      cwd: PROJECT_ROOT_DIRECTORY,
      env: stack.environment,
    })),
    waitForApps: async (signal) => waitForApps(stack, signal),
  };
}
