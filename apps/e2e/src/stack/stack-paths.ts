import path from 'node:path';

/** This workspace; the stack resolves every path from it, wherever a script is started. */
export const E2E_WORKSPACE_DIRECTORY = path.resolve(import.meta.dirname, '../..');

export const PROJECT_ROOT_DIRECTORY = path.resolve(E2E_WORKSPACE_DIRECTORY, '../..');

/** The dev configuration the stack runs, with its ports and data moved to the slot's own. */
export const ENV_EXAMPLE_PATH = path.join(PROJECT_ROOT_DIRECTORY, '.env.example');

export const ROOT_PACKAGE_JSON_PATH = path.join(PROJECT_ROOT_DIRECTORY, 'package.json');

/** Local state of the stacks this checkout runs; never committed. */
export const STACK_STATE_DIRECTORY = path.join(E2E_WORKSPACE_DIRECTORY, '.stack');

/** Names the slot of the stack this checkout is running, while it runs. */
export const RUNNING_STACK_MARKER_PATH = path.join(STACK_STATE_DIRECTORY, 'running-stack.json');

/** The compose file, local data (such as SQLite files) and other state of one slot. */
export function slotStateDirectory(slot: number) {
  return path.join(STACK_STATE_DIRECTORY, `slot-${slot}`);
}

export function slotDataDirectory(slot: number) {
  return path.join(slotStateDirectory(slot), 'data');
}
