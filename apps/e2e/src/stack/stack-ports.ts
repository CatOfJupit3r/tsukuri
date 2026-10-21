/** How many stacks can run on one machine at once, one per slot. */
export const STACK_SLOT_COUNT = 10;

/** Slot ports sit this far above the dev ports, so a stack runs beside the dev servers. */
const SLOT_PORT_OFFSET = 10_000;
const MAX_PORT = 65_535;

/** The port a slot's stack uses in place of a dev port: slot 0 adds the offset, and each further slot adds one more. */
export function toSlotPort(devPort: number, slot: number) {
  const slotPort = devPort + SLOT_PORT_OFFSET + slot;
  if (slotPort > MAX_PORT) {
    throw new Error(
      `Dev port ${devPort} leaves no room for E2E stack slot ${slot}; use a dev port below ${MAX_PORT - SLOT_PORT_OFFSET - STACK_SLOT_COUNT}.`,
    );
  }
  return slotPort;
}

/** Each dev port with the port the slot's stack uses instead. */
export function buildSlotPortMap(devPorts: readonly number[], slot: number) {
  return new Map(devPorts.map((devPort) => [devPort, toSlotPort(devPort, slot)]));
}
