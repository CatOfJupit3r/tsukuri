import { spawn } from 'node:child_process';

export interface iCommandRunner {
  /** Runs `command` in `cwd` with inherited output and resolves with its exit code. */
  run: (command: string, args: string[], cwd: string) => Promise<number>;
}

export const COMMAND_RUNNER_TOKEN = Symbol.for('create-tsukuri.command-runner');

export class NodeCommandRunner implements iCommandRunner {
  public async run(command: string, args: string[], cwd: string) {
    return new Promise<number>((resolve) => {
      // shell: true resolves the pnpm/git shims on Windows; arguments are generator-controlled.
      const child = spawn(command, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' });
      child.on('error', () => resolve(1));
      child.on('close', (code) => resolve(code ?? 1));
    });
  }
}
