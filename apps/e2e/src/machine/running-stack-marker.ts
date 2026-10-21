import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { isProcessRunning } from '#~/processes/process-tree';
import { RUNNING_STACK_MARKER_PATH } from '#~/stack/stack-paths';

interface iRunningStackMarker {
  slot: number;
  pid: number;
}

async function readMarker(): Promise<iRunningStackMarker | null> {
  const content = await readFile(RUNNING_STACK_MARKER_PATH, 'utf8').catch(() => null);
  if (content === null) return null;
  const marker: unknown = JSON.parse(content);
  if (typeof marker !== 'object' || marker === null) return null;
  const slot: unknown = Reflect.get(marker, 'slot');
  const pid: unknown = Reflect.get(marker, 'pid');
  return typeof slot === 'number' && typeof pid === 'number' ? { slot, pid } : null;
}

/** The stack this checkout runs; a marker whose process is gone was left by a stack that was killed. */
export async function readRunningStack() {
  const marker = await readMarker();
  return marker !== null && isProcessRunning(marker.pid) ? marker : null;
}

export async function writeRunningStackMarker(slot: number) {
  await mkdir(path.dirname(RUNNING_STACK_MARKER_PATH), { recursive: true });
  await writeFile(RUNNING_STACK_MARKER_PATH, JSON.stringify({ slot, pid: process.pid } satisfies iRunningStackMarker));
}

/** Removes the marker when it is this process's. */
export async function removeRunningStackMarker() {
  if ((await readMarker())?.pid === process.pid) await rm(RUNNING_STACK_MARKER_PATH, { force: true });
}
