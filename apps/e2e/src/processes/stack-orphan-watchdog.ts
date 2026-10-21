/**
 * Runs beside the E2E stack script and stops its server trees once the script is gone. A hard kill (SIGKILL,
 * Stop-Process, taskkill /F without /T) ends the script without running its shutdown handlers, and on Windows also
 * ends each server's shell, which Node keeps in a kill-on-close job, while the shell's descendants keep running. On
 * Windows, an intermediate process can also exit first and orphan the rest of its tree, so the watchdog records
 * every process of each tree while the script runs and stops them all by PID and creation time.
 * Usage: stack-orphan-watchdog.ts <owner pid> <server pid>...
 */
import { setTimeout as delay } from 'node:timers/promises';

import {
  collectProcessTreeMembers,
  findRunningMembers,
  IS_WINDOWS,
  isProcessRunning,
  killProcessTree,
  queryWindowsProcessTable,
} from './process-tree';
import type { ProcessTreeMembers } from './process-tree';

const OWNER_POLL_INTERVAL_MS = 500;
const TREE_REFRESH_INTERVAL_MS = 5000;

const [ownerPid = 0, ...serverPids] = process.argv.slice(2).map(Number);

async function waitForOwnerExit(onPoll: () => Promise<unknown>) {
  while (isProcessRunning(ownerPid)) {
    await delay(OWNER_POLL_INTERVAL_MS);
    await onPoll();
  }
}

async function watchWindowsServers() {
  const roots = (await queryWindowsProcessTable()).filter((entry) => serverPids.includes(entry.pid));
  let members: ProcessTreeMembers = new Map(roots.map((entry) => [entry.pid, entry.creationFileTime]));
  if (members.size === 0) return;
  let lastRefreshTime = Date.now();
  await waitForOwnerExit(async () => {
    if (Date.now() - lastRefreshTime < TREE_REFRESH_INTERVAL_MS) return;
    members = collectProcessTreeMembers(await queryWindowsProcessTable(), members);
    lastRefreshTime = Date.now();
  });
  const processTable = await queryWindowsProcessTable();
  for (const pid of findRunningMembers(processTable, collectProcessTreeMembers(processTable, members))) {
    killProcessTree(pid);
  }
}

async function watchPosixServers() {
  await waitForOwnerExit(async () => undefined);
  for (const serverPid of serverPids) killProcessTree(serverPid);
}

await (IS_WINDOWS ? watchWindowsServers() : watchPosixServers());
