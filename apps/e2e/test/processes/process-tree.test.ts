import { collectProcessTreeMembers, findRunningMembers } from '#~/processes/process-tree';
import type { iProcessEntry } from '#~/processes/process-tree';

function entry(pid: number, parentPid: number, creationFileTime: number): iProcessEntry {
  return { pid, parentPid, creationFileTime: BigInt(creationFileTime) };
}

describe('collectProcessTreeMembers', () => {
  it('follows descendants through a member that already exited', () => {
    // 10 (shell) started 20 (pnpm), which exited and left 30 (node) and its child 40 (vite).
    const processTable = [entry(10, 1, 100), entry(30, 20, 120), entry(40, 30, 130), entry(50, 1, 140)];
    const knownMembers = new Map([
      [10, 100n],
      [20, 110n],
    ]);

    const members = collectProcessTreeMembers(processTable, knownMembers);

    expect([...members.keys()].toSorted()).toEqual([10, 20, 30, 40]);
    expect(findRunningMembers(processTable, members)).toEqual([10, 30, 40]);
  });

  it('leaves out processes of a reused PID', () => {
    // PID 20 exited and was reused by an unrelated process, whose child 30 is not part of the tree.
    const processTable = [entry(10, 1, 100), entry(20, 1, 300), entry(30, 20, 310)];
    const knownMembers = new Map([
      [10, 100n],
      [20, 110n],
    ]);

    const members = collectProcessTreeMembers(processTable, knownMembers);

    expect([...members.keys()].toSorted()).toEqual([10, 20]);
    expect(findRunningMembers(processTable, members)).toEqual([10]);
  });
});
