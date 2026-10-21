import { stopRunningStack } from '#~/runner/stop-running-stack';
import type { iStopStackSteps } from '#~/runner/stop-running-stack';

function createSteps(overrides: Partial<iStopStackSteps>) {
  const calls: string[] = [];
  const steps: iStopStackSteps = {
    readRunningStackPid: async () => 4242,
    signalProcess: (pid, signal) => calls.push(`${signal} ${pid}`),
    waitForExit: async () => calls.push('exited'),
    removeServices: async () => calls.push('removeServices'),
    removeState: async () => calls.push('removeState'),
    ...overrides,
  };
  return { calls, steps };
}

describe('stopRunningStack', () => {
  it('lets the stack stop itself, then removes what is left', async () => {
    const { calls, steps } = createSteps({});

    await stopRunningStack(steps);

    expect(calls).toEqual(['SIGTERM 4242', 'exited', 'removeServices', 'removeState']);
  });

  it('kills a stack that does not stop in time and still removes its services and state', async () => {
    const { calls, steps } = createSteps({
      waitForExit: async () => {
        throw new Error('still running');
      },
    });

    await stopRunningStack(steps);

    expect(calls).toEqual(['SIGTERM 4242', 'SIGKILL 4242', 'removeServices', 'removeState']);
  });

  it('only removes the services and state when no stack runs', async () => {
    const { calls, steps } = createSteps({ readRunningStackPid: async () => null });

    await stopRunningStack(steps);

    expect(calls).toEqual(['removeServices', 'removeState']);
  });
});
