import { open, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { isProcessRunning } from '#~/processes/process-tree';
import { CHECKOUT_ID } from '#~/stack/stack-paths';

import { readJsonObject, readNumberField } from './json-file';

const LOCK_EXISTS_CODE = 'EEXIST';

interface iSlotLockOwner {
  pid: number;
  checkoutId: string;
}

/** Machine-wide, so stacks of every checkout and project see it. */
function slotLockPath(slot: number) {
  return path.join(os.tmpdir(), `e2e-stack-slot-${slot}.lock`);
}

/** The process that holds the slot's lock; a lock whose process is gone was left by a stack that was killed. */
export async function readSlotLockOwner(slot: number): Promise<iSlotLockOwner | null> {
  const lock = await readJsonObject(slotLockPath(slot));
  const pid = lock === null ? null : readNumberField(lock, 'pid');
  if (lock === null || pid === null || !isProcessRunning(pid)) return null;
  const checkoutId: unknown = Reflect.get(lock, 'checkoutId');
  return { pid, checkoutId: typeof checkoutId === 'string' ? checkoutId : '' };
}

async function tryCreateLock(slot: number) {
  try {
    const handle = await open(slotLockPath(slot), 'wx');
    await handle.writeFile(JSON.stringify({ pid: process.pid, checkoutId: CHECKOUT_ID } satisfies iSlotLockOwner));
    await handle.close();
    return true;
  } catch (error) {
    if (error instanceof Error && Reflect.get(error, 'code') === LOCK_EXISTS_CODE) return false;
    throw error;
  }
}

/**
 * Takes the slot for this process until the returned release runs, so two stacks that chose the same slot at once
 * never share its compose project and ports. Fails while a live process holds it; a stale lock is taken over.
 */
export async function acquireSlotLock(slot: number) {
  if (!(await tryCreateLock(slot))) {
    const owner = await readSlotLockOwner(slot);
    if (owner !== null) {
      throw new Error(`E2E stack slot ${slot} is taken by process ${owner.pid}; set E2E_STACK_SLOT to another slot.`);
    }
    await rm(slotLockPath(slot), { force: true });
    if (!(await tryCreateLock(slot))) throw new Error(`E2E stack slot ${slot} was taken while this stack claimed it.`);
  }
  return async () => {
    if ((await readSlotLockOwner(slot))?.pid === process.pid) await rm(slotLockPath(slot), { force: true });
  };
}
