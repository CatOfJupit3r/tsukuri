import { chooseStackSlot } from '#~/stack/stack-slot';
import type { iStackSlotProbe } from '#~/stack/stack-slot';

function createProbe(overrides: Partial<iStackSlotProbe> = {}): iStackSlotProbe {
  return {
    readRunningSlot: async () => null,
    listComposeSlots: async () => new Map(),
    isPortFree: async () => true,
    ...overrides,
  };
}

const slotPorts = (slot: number) => [13030 + slot, 15432 + slot];

describe('chooseStackSlot', () => {
  it('keeps the slot of the stack this checkout already runs', async () => {
    const probe = createProbe({ readRunningSlot: async () => 3, isPortFree: async () => false });

    await expect(chooseStackSlot(probe, slotPorts)).resolves.toBe(3);
  });

  it('reuses the slot whose leftover containers this checkout started', async () => {
    const probe = createProbe({
      listComposeSlots: async () =>
        new Map([
          [0, { isOwn: false }],
          [2, { isOwn: true }],
        ]),
    });

    await expect(chooseStackSlot(probe, slotPorts)).resolves.toBe(2);
  });

  it('skips slots held by another checkout or by a taken port', async () => {
    const probe = createProbe({
      listComposeSlots: async () => new Map([[0, { isOwn: false }]]),
      isPortFree: async (port) => port !== 15433,
    });

    await expect(chooseStackSlot(probe, slotPorts)).resolves.toBe(2);
  });

  it('fails when every slot is held', async () => {
    const probe = createProbe({ isPortFree: async () => false });

    await expect(chooseStackSlot(probe, slotPorts)).rejects.toThrow(/All 10 E2E stack slots are in use/);
  });
});
