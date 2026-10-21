import { execFile, spawnSync } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export const IS_WINDOWS = process.platform === 'win32';

export interface iProcessEntry {
  pid: number;
  parentPid: number;
  creationFileTime: bigint;
}

/** Processes known to belong to a tree, by PID, with the creation time that tells them from a later reuse of the PID. */
export type ProcessTreeMembers = ReadonlyMap<number, bigint>;

/**
 * Stops a process and every descendant. Windows walks the tree with taskkill; POSIX signals the process
 * group, so the process must have been spawned `detached` to lead one.
 */
export function killProcessTree(pid: number) {
  if (IS_WINDOWS) {
    // Runs from `exit` handlers too, which only run synchronous code.
    // eslint-disable-next-line n/no-sync
    spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
    return;
  }
  try {
    process.kill(-pid, 'SIGTERM');
  } catch {
    // The process group already exited.
  }
}

export function isProcessRunning(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error instanceof Error && Reflect.get(error, 'code') === 'EPERM';
  }
}

/** Reads the PID, parent PID and creation time of every Windows process. */
export async function queryWindowsProcessTable() {
  const { stdout } = await execFileAsync(
    'powershell',
    [
      '-NoProfile',
      '-Command',
      "Get-CimInstance Win32_Process | Where-Object { $_.CreationDate } | ForEach-Object { '{0} {1} {2}' -f $_.ProcessId, $_.ParentProcessId, $_.CreationDate.ToFileTimeUtc() }",
    ],
    { encoding: 'utf8', windowsHide: true },
  );
  return stdout
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '')
    .map((line): iProcessEntry => {
      const [pid, parentPid, creationFileTime] = line.trim().split(' ');
      return { pid: Number(pid), parentPid: Number(parentPid), creationFileTime: BigInt(creationFileTime ?? 0) };
    });
}

function isChildOfMember(
  entry: iProcessEntry,
  members: ProcessTreeMembers,
  runningCreationFileTimes: ProcessTreeMembers,
) {
  const parentCreationFileTime = members.get(entry.parentPid);
  if (parentCreationFileTime === undefined || entry.creationFileTime < parentCreationFileTime) return false;
  const parentPidHolderCreationFileTime = runningCreationFileTimes.get(entry.parentPid);
  const isParentPidReused =
    parentPidHolderCreationFileTime !== undefined && parentPidHolderCreationFileTime !== parentCreationFileTime;
  return !isParentPidReused || entry.creationFileTime < parentPidHolderCreationFileTime;
}

/**
 * Extends the known members of a tree with every descendant in the process table. Windows does not reparent
 * orphans: they keep the PID of their exited parent, so a member that already exited still leads to its
 * children. A process created before its supposed parent, or after another process took over the parent's
 * PID, belongs to a reused PID and is left out.
 */
export function collectProcessTreeMembers(processTable: readonly iProcessEntry[], knownMembers: ProcessTreeMembers) {
  const members = new Map(knownMembers);
  const runningCreationFileTimes = new Map(processTable.map((entry) => [entry.pid, entry.creationFileTime]));
  let hasFoundMember = true;
  while (hasFoundMember) {
    const newMembers = processTable.filter(
      (entry) => !members.has(entry.pid) && isChildOfMember(entry, members, runningCreationFileTimes),
    );
    for (const entry of newMembers) members.set(entry.pid, entry.creationFileTime);
    hasFoundMember = newMembers.length > 0;
  }
  return members;
}

/** The members still running under the PID and creation time they were recorded with. */
export function findRunningMembers(processTable: readonly iProcessEntry[], members: ProcessTreeMembers) {
  return processTable.filter((entry) => members.get(entry.pid) === entry.creationFileTime).map((entry) => entry.pid);
}
