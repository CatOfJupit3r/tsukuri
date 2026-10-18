import { spawn } from 'node:child_process';

export interface iCommandResult {
  exitCode: number | null;
  output: string;
}

/** Runs a shell command and captures combined stdout/stderr. */
export function runCommand(command: string, cwd: string) {
  return new Promise<iCommandResult>((resolve) => {
    const child = spawn(command, { cwd, shell: true, env: { ...process.env, CI: 'true' } });
    let output = '';
    child.stdout.on('data', (chunk: Buffer) => {
      output += chunk.toString();
    });
    child.stderr.on('data', (chunk: Buffer) => {
      output += chunk.toString();
    });
    child.on('close', (exitCode) => resolve({ exitCode, output }));
  });
}
