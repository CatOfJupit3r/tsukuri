import { createHash } from 'node:crypto';
import path from 'node:path';

/** This workspace; the stack resolves every path from it, wherever a script is started. */
export const E2E_WORKSPACE_DIRECTORY = path.resolve(import.meta.dirname, '../..');

export const PROJECT_ROOT_DIRECTORY = path.resolve(E2E_WORKSPACE_DIRECTORY, '../..');

/** Windows and macOS file systems ignore case by default, so one checkout keeps one id however its path is typed. */
const IS_PATH_CASE_INSENSITIVE = process.platform === 'win32' || process.platform === 'darwin';
const CHECKOUT_ID_LENGTH = 8;

/** Normalizes a directory for comparing checkouts. */
export function toCheckoutPath(directory: string) {
  const resolved = path.resolve(directory);
  return IS_PATH_CASE_INSENSITIVE ? resolved.toLowerCase() : resolved;
}

/** A short id of this checkout, in its compose project names, so two checkouts of one project never share one. */
export const CHECKOUT_ID = createHash('sha256')
  .update(toCheckoutPath(E2E_WORKSPACE_DIRECTORY))
  .digest('hex')
  .slice(0, CHECKOUT_ID_LENGTH);

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
