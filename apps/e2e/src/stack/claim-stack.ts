import path from 'node:path';

import { createMachineSlotProbe } from '#~/machine/machine-slot-probe';

import type { iStackDefinition } from './stack-definition';
import { readStackDefinition } from './stack-definition';
import { buildStackEnvironment } from './stack-environment';
import { CHECKOUT_ID, PROJECT_ROOT_DIRECTORY, slotDataDirectory, slotStateDirectory } from './stack-paths';
import { buildSlotPortMap, toSlotPort } from './stack-ports';
import { chooseStackSlot, parseStackSlot, STACK_SLOT_ENV_NAME } from './stack-slot';

/** Characters a compose project name may not contain, and separators it may not start or end with. */
const INVALID_PROJECT_NAME_CHARACTERS = /[^a-z0-9_-]+/g;
const EDGE_SEPARATORS = /^[_-]+|[_-]+$/g;

/** One slot's stack: where it listens and the environment its services and apps run with. */
export interface iStack {
  slot: number;
  definition: iStackDefinition;
  composeProjectName: string;
  /** The port the stack uses for each dev port. */
  portMap: Map<number, number>;
  /** The ports of the slot's apps (not its compose services). */
  appPorts: number[];
  webBaseUrl: string;
  environment: Record<string, string>;
  stateDirectory: string;
  dataDirectory: string;
}

function composeProjectNameOf(definition: iStackDefinition, slot: number) {
  const projectName = definition.projectName
    .toLowerCase()
    .replace(INVALID_PROJECT_NAME_CHARACTERS, '-')
    .replace(EDGE_SEPARATORS, '');
  return `${projectName}-e2e-${slot}-${CHECKOUT_ID}`;
}

/** The stack `definition` runs in `slot`, in an environment derived from `baseEnvironment`. */
export function describeStack(definition: iStackDefinition, slot: number, baseEnvironment: NodeJS.ProcessEnv): iStack {
  const portMap = buildSlotPortMap(definition.devPorts, slot);
  const dataDirectory = slotDataDirectory(slot);
  return {
    slot,
    definition,
    composeProjectName: composeProjectNameOf(definition, slot),
    portMap,
    appPorts: definition.apps.map((app) => toSlotPort(app.devPort, slot)),
    webBaseUrl: `http://localhost:${toSlotPort(definition.webDevPort, slot)}`,
    environment: {
      ...buildStackEnvironment({
        exampleEnvironment: definition.exampleEnvironment,
        baseEnvironment,
        portMap,
        dataDirectory: path.relative(PROJECT_ROOT_DIRECTORY, dataDirectory),
      }),
      [STACK_SLOT_ENV_NAME]: String(slot),
    },
    stateDirectory: slotStateDirectory(slot),
    dataDirectory,
  };
}

/**
 * Settles the slot of this checkout's stack: the one `E2E_STACK_SLOT` pins, else the one this checkout already runs,
 * else the first free one. The slot is written to the process environment, so child processes and Playwright workers
 * share it.
 */
export async function claimStack() {
  const definition = await readStackDefinition();
  const probe = createMachineSlotProbe();
  const slot =
    parseStackSlot(process.env[STACK_SLOT_ENV_NAME]) ??
    (await chooseStackSlot(probe, (candidate) => definition.devPorts.map((devPort) => toSlotPort(devPort, candidate))));
  process.env[STACK_SLOT_ENV_NAME] = String(slot);
  return describeStack(definition, slot, process.env);
}
