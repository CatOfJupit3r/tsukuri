import type { iBackgroundCommand, StackBackgroundProcesses } from '#~/processes/stack-background-processes';

export type StackProcesses = Pick<StackBackgroundProcesses, 'startAll' | 'stopAll' | 'stopSignal'>;

/** What booting a stack does on the machine; injected so the order and the failure paths can be exercised. */
export interface iStackBootSteps {
  /** The process of the stack this checkout already runs, if any. */
  readRunningStackPid: () => Promise<number | null>;
  assertAppPortsAreFree: () => Promise<unknown>;
  /** Takes the slot for this stack; resolves to the release. */
  acquireSlotLock: () => Promise<() => Promise<unknown>>;
  writeRunningMarker: () => Promise<unknown>;
  removeRunningMarker: () => Promise<unknown>;
  startServices: (signal: AbortSignal) => Promise<unknown>;
  stopServices: () => Promise<unknown>;
  resetData: (signal: AbortSignal) => Promise<unknown>;
  buildApps: (signal: AbortSignal) => Promise<unknown>;
  appCommands: iBackgroundCommand[];
  waitForApps: (signal: AbortSignal) => Promise<unknown>;
}

async function assertNotRunning(steps: iStackBootSteps) {
  const runningPid = await steps.readRunningStackPid();
  if (runningPid !== null && runningPid !== process.pid) {
    throw new Error(
      `This checkout's E2E stack already runs (process ${runningPid}); stop it with pnpm run e2e:cleanup.`,
    );
  }
}

async function startStack(steps: iStackBootSteps, processes: StackProcesses) {
  const { stopSignal } = processes;
  await steps.startServices(stopSignal);
  stopSignal.throwIfAborted();
  await steps.resetData(stopSignal);
  stopSignal.throwIfAborted();
  await steps.buildApps(stopSignal);
  processes.startAll(steps.appCommands);
  await steps.waitForApps(stopSignal);
}

/**
 * Boots a stack: refuses a second stack of this checkout, takes the slot, then starts the services, resets the data,
 * builds and starts the apps and waits for them. Stopping the stack (a signal, a failed step, a server that exits)
 * aborts the remaining steps; the apps stop first, then the services, the marker and the slot lock go.
 */
export async function bootStack(
  steps: iStackBootSteps,
  createProcesses: (onStop: () => Promise<unknown>) => StackProcesses,
) {
  await assertNotRunning(steps);
  await steps.assertAppPortsAreFree();
  const releaseSlotLock = await steps.acquireSlotLock();
  await steps.writeRunningMarker();
  const processes = createProcesses(async () => {
    await steps.stopServices();
    await steps.removeRunningMarker();
    await releaseSlotLock();
  });
  try {
    await startStack(steps, processes);
  } catch (error) {
    processes.stopAll();
    throw error;
  }
  return processes;
}
