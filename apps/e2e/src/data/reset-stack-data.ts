import { mkdir, rm } from 'node:fs/promises';

import { runCommand } from '#~/lib/run-command';
import type { iStack } from '#~/stack/claim-stack';
import { PROJECT_ROOT_DIRECTORY } from '#~/stack/stack-paths';

/** The project's own reset steps, run as root scripts when the installed modules define them. */
const RESET_SCRIPTS = ['db:migrate'];

/**
 * Brings the slot's data to a known state before its apps start: an empty data folder, then the project's reset
 * scripts (the database migrations) against the slot's freshly started services.
 */
export async function resetStackData(stack: iStack, signal?: AbortSignal) {
  await rm(stack.dataDirectory, { recursive: true, force: true });
  await mkdir(stack.dataDirectory, { recursive: true });

  for (const script of RESET_SCRIPTS) {
    console.log(`[e2e-stack] pnpm run ${script}`);
    await runCommand('pnpm', ['run', '--if-present', script], {
      cwd: PROJECT_ROOT_DIRECTORY,
      env: stack.environment,
      signal,
    });
  }
}
