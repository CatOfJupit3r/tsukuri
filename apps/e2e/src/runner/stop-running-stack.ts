/** What stopping this checkout's stack does on the machine; injected so the escalation can be exercised. */
export interface iStopStackSteps {
  readRunningStackPid: () => Promise<number | null>;
  signalProcess: (pid: number, signal: NodeJS.Signals) => unknown;
  /** Rejects when the process still runs after the wait. */
  waitForExit: (pid: number) => Promise<unknown>;
  removeServices: () => Promise<unknown>;
  removeState: () => Promise<unknown>;
}

/**
 * Stops the stack process (it stops its apps and services), kills it when it does not stop in time, then removes
 * whatever is left: the compose project with its volumes and the local state.
 */
export async function stopRunningStack(steps: iStopStackSteps) {
  const runningPid = await steps.readRunningStackPid();
  if (runningPid !== null) {
    console.log(`[e2e-cleanup] Stopping the stack process ${runningPid}`);
    steps.signalProcess(runningPid, 'SIGTERM');
    await steps.waitForExit(runningPid).catch(() => {
      console.warn(`[e2e-cleanup] The stack process ${runningPid} did not stop; killing it`);
      steps.signalProcess(runningPid, 'SIGKILL');
    });
  }
  await steps.removeServices();
  await steps.removeState();
}
