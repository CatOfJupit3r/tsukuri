import { spawn } from 'node:child_process';

import { IS_WINDOWS, killProcessTree } from '#~/processes/process-tree';

export interface iRunCommandOptions {
  cwd: string;
  env?: NodeJS.ProcessEnv;
  /** Stops the command with its whole process tree and rejects with the signal's reason. */
  signal?: AbortSignal;
}

/** Runs a command with inherited output and resolves once it exits successfully. */
export async function runCommand(command: string, args: readonly string[], { cwd, env, signal }: iRunCommandOptions) {
  signal?.throwIfAborted();
  return new Promise<unknown>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: 'inherit',
      // pnpm is a `.cmd` shim on Windows, which only a shell runs.
      shell: IS_WINDOWS,
      // Its own POSIX process group, so an abort reaches every descendant.
      detached: !IS_WINDOWS,
    });
    const abort = () => {
      if (child.pid !== undefined) killProcessTree(child.pid);
    };
    signal?.addEventListener('abort', abort, { once: true });
    child.on('error', reject);
    child.on('exit', (code) => {
      signal?.removeEventListener('abort', abort);
      if (signal?.aborted) reject(signal.reason);
      else if (code === 0) resolve(code);
      else reject(new Error(`${command} ${args.join(' ')} exited with code ${code ?? 'null'}`));
    });
  });
}
