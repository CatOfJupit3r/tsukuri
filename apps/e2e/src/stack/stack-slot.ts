import { STACK_SLOT_COUNT } from './stack-ports';

/** Pins the slot; every process of one run shares it through this variable. */
export const STACK_SLOT_ENV_NAME = 'E2E_STACK_SLOT';

/** What choosing a slot asks the machine; injected so the choice can be exercised without Docker. */
export interface iStackSlotProbe {
  /** The slot of the stack this checkout is running, if it runs one. */
  readRunningSlot: () => Promise<number | null>;
  /** The slot of each compose project that still has containers, with whether this checkout started it. */
  listComposeSlots: () => Promise<Map<number, { isOwn: boolean }>>;
  isPortFree: (port: number) => Promise<boolean>;
}

export function parseStackSlot(rawSlot: string | undefined) {
  if (rawSlot === undefined || rawSlot === '') return null;
  const slot = Number(rawSlot);
  if (!Number.isInteger(slot) || slot < 0 || slot >= STACK_SLOT_COUNT) {
    throw new Error(`${STACK_SLOT_ENV_NAME} must be a whole number from 0 to ${STACK_SLOT_COUNT - 1}`);
  }
  return slot;
}

async function arePortsFree(probe: iStackSlotProbe, ports: readonly number[]) {
  return (await Promise.all(ports.map(async (port) => probe.isPortFree(port)))).every(Boolean);
}

async function findFreeSlot(
  probe: iStackSlotProbe,
  composeSlots: ReadonlySet<number>,
  slotPorts: (slot: number) => number[],
) {
  for (let slot = 0; slot < STACK_SLOT_COUNT; slot += 1) {
    if (!composeSlots.has(slot) && (await arePortsFree(probe, slotPorts(slot)))) return slot;
  }
  return null;
}

/**
 * The slot of the stack this checkout runs, else the slot its leftover containers hold, else the first slot that
 * neither another checkout's containers nor a taken port hold.
 */
export async function chooseStackSlot(probe: iStackSlotProbe, slotPorts: (slot: number) => number[]) {
  const runningSlot = await probe.readRunningSlot();
  if (runningSlot !== null) return runningSlot;

  const composeSlots = await probe.listComposeSlots();
  const ownSlot = [...composeSlots].find(([, owner]) => owner.isOwn)?.[0];
  if (ownSlot !== undefined) return ownSlot;

  const freeSlot = await findFreeSlot(probe, new Set(composeSlots.keys()), slotPorts);
  if (freeSlot === null) {
    throw new Error(
      `All ${STACK_SLOT_COUNT} E2E stack slots are in use. Stop a stack with "pnpm run e2e:cleanup" in its checkout.`,
    );
  }
  return freeSlot;
}
