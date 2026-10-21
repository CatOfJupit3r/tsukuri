import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import path from 'node:path';

import { IS_WINDOWS, killProcessTree } from './process-tree';

const STOP_SIGNALS = ['SIGINT', 'SIGTERM', 'SIGHUP'] as const;
const WATCHDOG_SCRIPT_PATH = path.join(import.meta.dirname, 'stack-orphan-watchdog.ts');

export interface iBackgroundCommand {
  command: string;
  args: string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
}

/**
 * Owns the long-running servers of the E2E stack and stops each one with its whole process tree: the servers run
 * through `pnpm`, so killing only the spawned process would leave its node and vite descendants running. The stack
 * stops on a stop signal, on exit, when one of its servers exits, and, through a watchdog over every server tree,
 * when this script is killed outright or when part of a tree was orphaned by an intermediate process that exited
 * first.
 */
export class StackBackgroundProcesses {
  private readonly servers: ChildProcess[] = [];

  private readonly stopController = new AbortController();

  private isStopping = false;

  public constructor(private readonly onStop: () => Promise<unknown>) {
    for (const signal of STOP_SIGNALS) {
      process.on(signal, () => {
        console.log(`[e2e-stack] Received ${signal}, stopping the stack...`);
        this.stopAll();
      });
    }
    process.on('exit', () => this.stopAll());
  }

  /** Aborted once the stack starts stopping, so waits for its servers end early. */
  public get stopSignal() {
    return this.stopController.signal;
  }

  public startAll(commands: readonly iBackgroundCommand[]) {
    for (const command of commands) this.start(command);
    const serverPids = this.servers.flatMap((server) => (server.pid === undefined ? [] : [server.pid]));
    if (serverPids.length > 0) this.startOrphanWatchdog(serverPids);
  }

  /**
   * Stops every server, then runs `onStop` once they exited (from an `exit` handler, only the synchronous kill
   * happens). The script ends when nothing is left to wait for.
   */
  public stopAll() {
    if (this.isStopping) return;
    this.isStopping = true;
    this.stopController.abort(new Error('The stack stopped'));
    console.log('[e2e-stack] Stopping background processes...');
    const runningServers = this.servers.filter((server) => server.exitCode === null && server.signalCode === null);
    const exits = runningServers.map(async (server) => once(server, 'exit'));
    for (const server of runningServers) {
      if (server.pid !== undefined) killProcessTree(server.pid);
    }
    void Promise.all(exits).then(this.onStop);
  }

  private start({ command, args, cwd, env }: iBackgroundCommand) {
    const server = spawn(command, args, {
      cwd,
      env,
      stdio: 'inherit',
      // pnpm is a `.cmd` shim on Windows, which only a shell runs.
      shell: IS_WINDOWS,
      // A POSIX process group lets one signal reach every descendant; Windows walks the tree with taskkill instead.
      detached: !IS_WINDOWS,
    });
    server.on('error', (error) => {
      console.error('[e2e-stack] Background process error:', error);
    });
    server.on('exit', (code) => {
      if (this.isStopping) return;
      console.error(`[e2e-stack] ${[command, ...args].join(' ')} exited with code ${code ?? 'null'}`);
      process.exitCode = 1;
      this.stopAll();
    });
    this.servers.push(server);
  }

  private startOrphanWatchdog(serverPids: readonly number[]) {
    const watchdog = spawn(
      process.execPath,
      [...process.execArgv, WATCHDOG_SCRIPT_PATH, String(process.pid), ...serverPids.map(String)],
      { detached: true, stdio: 'ignore', windowsHide: true },
    );
    watchdog.unref();
  }
}
