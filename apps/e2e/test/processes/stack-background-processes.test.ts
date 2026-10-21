import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { isProcessRunning } from '#~/processes/process-tree';
import { StackBackgroundProcesses } from '#~/processes/stack-background-processes';

/** A server that writes its pid, then takes a moment to shut down on SIGTERM. */
const SLOW_SERVER_SCRIPT = `
require('node:fs').writeFileSync(process.argv[1], String(process.pid));
process.on('SIGTERM', () => setTimeout(() => process.exit(0), 300));
setInterval(() => {}, 1000);
`;

describe.skipIf(process.platform === 'win32')('StackBackgroundProcesses', () => {
  let directory = '';

  beforeEach(async () => {
    directory = await mkdtemp(path.join(os.tmpdir(), 'stack-processes-'));
  });

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  it('runs onStop only once every server exited', async () => {
    const pidFile = path.join(directory, 'server.pid');
    const serverPidsAtStop: boolean[] = [];
    const processes = new StackBackgroundProcesses({
      shouldWatchOrphans: false,
      onStop: async () => {
        const pid = Number(await readFile(pidFile, 'utf8'));
        serverPidsAtStop.push(isProcessRunning(pid));
      },
    });
    processes.startAll([
      { command: process.execPath, args: ['-e', SLOW_SERVER_SCRIPT, pidFile], cwd: directory, env: process.env },
    ]);
    await vi.waitFor(async () => expect(await readFile(pidFile, 'utf8')).not.toBe(''));

    processes.stopAll();
    await processes.whenStopped;

    expect(serverPidsAtStop).toEqual([false]);
  });

  it('refuses to start servers once the stack is stopping', async () => {
    const processes = new StackBackgroundProcesses({ shouldWatchOrphans: false, onStop: async () => undefined });
    processes.stopAll();

    expect(() =>
      processes.startAll([{ command: process.execPath, args: ['-e', ''], cwd: directory, env: process.env }]),
    ).toThrow('The E2E stack stopped');
    await processes.whenStopped;
  });
});
