import { bootStack } from '#~/runner/boot-stack';
import type { iStackBootSteps, StackProcesses } from '#~/runner/boot-stack';

/** Records every step in order; `processes` stands in for the servers and runs `onStop` when stopped. */
function createFakeStack(overrides: Partial<iStackBootSteps> = {}) {
  const calls: string[] = [];
  const record = (name: string) => async () => {
    calls.push(name);
  };
  const steps: iStackBootSteps = {
    readRunningStackPid: async () => null,
    assertAppPortsAreFree: record('assertAppPortsAreFree'),
    acquireSlotLock: async () => {
      calls.push('acquireSlotLock');
      return record('releaseSlotLock');
    },
    writeRunningMarker: record('writeRunningMarker'),
    removeRunningMarker: record('removeRunningMarker'),
    startServices: record('startServices'),
    stopServices: record('stopServices'),
    resetData: record('resetData'),
    buildApps: record('buildApps'),
    appCommands: [],
    waitForApps: record('waitForApps'),
    ...overrides,
  };
  const stopController = new AbortController();
  let processes: StackProcesses | null = null;
  const createProcesses = (onStop: () => Promise<unknown>): StackProcesses => {
    processes = {
      stopSignal: stopController.signal,
      startAll: () => {
        stopController.signal.throwIfAborted();
        calls.push('startApps');
      },
      stopAll: () => {
        if (stopController.signal.aborted) return;
        calls.push('stopApps');
        stopController.abort(new Error('stopped'));
        void onStop();
      },
    };
    return processes;
  };
  const stopFromOutside = () => processes?.stopAll();
  return { calls, steps, createProcesses, stopFromOutside };
}

describe('bootStack', () => {
  it('starts the services, resets the data, then builds and starts the apps', async () => {
    const stack = createFakeStack();

    await bootStack(stack.steps, stack.createProcesses);

    expect(stack.calls).toEqual([
      'assertAppPortsAreFree',
      'acquireSlotLock',
      'writeRunningMarker',
      'startServices',
      'resetData',
      'buildApps',
      'startApps',
      'waitForApps',
    ]);
  });

  it('refuses a second stack of this checkout before it touches anything', async () => {
    const stack = createFakeStack({ readRunningStackPid: async () => process.pid + 1 });

    await expect(bootStack(stack.steps, stack.createProcesses)).rejects.toThrow(/already runs/);
    expect(stack.calls).toEqual([]);
  });

  it('stops booting when the stack is stopped mid-way and removes what it started', async () => {
    const stack = createFakeStack();
    stack.steps.startServices = async () => {
      stack.calls.push('startServices');
      stack.stopFromOutside();
    };

    await expect(bootStack(stack.steps, stack.createProcesses)).rejects.toThrow('stopped');
    await vi.waitFor(() => expect(stack.calls).toContain('releaseSlotLock'));
    expect(stack.calls).not.toContain('resetData');
    expect(stack.calls).not.toContain('startApps');
    expect(stack.calls.slice(-4)).toEqual(['stopApps', 'stopServices', 'removeRunningMarker', 'releaseSlotLock']);
  });

  it('stops the apps before it removes the services when a step fails', async () => {
    const stack = createFakeStack({
      waitForApps: async () => {
        throw new Error('web app never answered');
      },
    });

    await expect(bootStack(stack.steps, stack.createProcesses)).rejects.toThrow('web app never answered');
    await vi.waitFor(() => expect(stack.calls).toContain('releaseSlotLock'));
    expect(stack.calls.slice(-4)).toEqual(['stopApps', 'stopServices', 'removeRunningMarker', 'releaseSlotLock']);
  });
});
