import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { CHECKOUT_ID } from '#~/stack/stack-paths';
import { STACK_SLOT_COUNT } from '#~/stack/stack-ports';
import type { iStackSlotProbe } from '#~/stack/stack-slot';

import { isPortFree } from './free-port';
import { readRunningStack } from './running-stack-marker';
import { readSlotLockOwner } from './slot-lock';

const COMPOSE_PROJECT_LABEL = 'com.docker.compose.project';
/** `<project>-e2e-<slot>-<checkout id>`, the compose project of any project's E2E stack. */
const STACK_PROJECT_PATTERN = /-e2e-(\d+)-([0-9a-f]+)$/;

const execFileAsync = promisify(execFile);

/** The compose project of every container compose created, running or not. */
async function listComposeProjectNames() {
  const { stdout } = await execFileAsync('docker', [
    'ps',
    '--all',
    '--filter',
    `label=${COMPOSE_PROJECT_LABEL}`,
    '--format',
    `{{.Label "${COMPOSE_PROJECT_LABEL}"}}`,
  ]);
  return stdout.split(/\r?\n/).filter((line) => line.trim() !== '');
}

async function listComposeSlots() {
  // Without a Docker daemon no stack has containers.
  const projectNames = await listComposeProjectNames().catch(() => []);
  const slots = new Map<number, { isOwn: boolean }>();
  for (const projectName of projectNames) {
    const [, rawSlot, checkoutId] = STACK_PROJECT_PATTERN.exec(projectName) ?? [];
    const slot = Number(rawSlot);
    if (rawSlot === undefined || slot >= STACK_SLOT_COUNT) continue;
    slots.set(slot, { isOwn: checkoutId === CHECKOUT_ID || slots.get(slot)?.isOwn === true });
  }
  return slots;
}

/** Asks this checkout's marker, Docker, the slot locks and the network which slots are held. */
export function createMachineSlotProbe(): iStackSlotProbe {
  return {
    readRunningSlot: async () => (await readRunningStack())?.slot ?? null,
    listComposeSlots,
    isSlotLocked: async (slot) => (await readSlotLockOwner(slot)) !== null,
    isPortFree,
  };
}
