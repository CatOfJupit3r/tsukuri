import { spawn } from 'node:child_process';

import { IS_WINDOWS } from '#~/processes/process-tree';

export interface iRunCommandOptions {
  cwd: string;
  env?: NodeJS.ProcessEnv;
}

/** Runs a command with inherited output and resolves once it exits successfully. */
export async function runCommand(command: string, args: readonly string[], { cwd, env }: iRunCommandOptions) {
  return new Promise<unknown>((resolve, reject) => {
    // pnpm is a `.cmd` shim on Windows, which only a shell runs.
    const child = spawn(command, args, { cwd, env, stdio: 'inherit', shell: IS_WINDOWS });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve(code);
      else reject(new Error(`${command} ${args.join(' ')} exited with code ${code ?? 'null'}`));
    });
  });
}
