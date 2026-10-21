import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';

import { STACK_SLOT_COUNT } from '#~/stack/stack-ports';
import type { iStackSlotProbe } from '#~/stack/stack-slot';

import { isPortFree } from './free-port';
import { readRunningStack } from './running-stack-marker';

const COMPOSE_PROJECT_LABEL = 'com.docker.compose.project';
const COMPOSE_WORKING_DIRECTORY_LABEL = 'com.docker.compose.project.working_dir';

const execFileAsync = promisify(execFile);

function isSameDirectory(left: string, right: string) {
  return path.resolve(left).toLowerCase() === path.resolve(right).toLowerCase();
}

/** The compose project and working directory of every container compose created, running or not. */
async function listComposeProjects() {
  const { stdout } = await execFileAsync('docker', [
    'ps',
    '--all',
    '--filter',
    `label=${COMPOSE_PROJECT_LABEL}`,
    '--format',
    `{{.Label "${COMPOSE_PROJECT_LABEL}"}}\t{{.Label "${COMPOSE_WORKING_DIRECTORY_LABEL}"}}`,
  ]);
  return stdout
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '')
    .map((line) => {
      const [projectName = '', workingDirectory = ''] = line.split('\t');
      return { projectName, workingDirectory };
    });
}

/**
 * Asks Docker which slots hold containers and the network which ports are taken. `composeProjectNameOf` names a slot's
 * compose project; `projectDirectory` is the directory this checkout starts its compose projects from.
 */
export function createMachineSlotProbe(
  composeProjectNameOf: (slot: number) => string,
  projectDirectory: string,
): iStackSlotProbe {
  return {
    readRunningSlot: async () => (await readRunningStack())?.slot ?? null,
    listComposeSlots: async () => {
      // Without a Docker daemon no stack has containers.
      const projects = await listComposeProjects().catch(() => []);
      const slots = new Map<number, { isOwn: boolean }>();
      for (let slot = 0; slot < STACK_SLOT_COUNT; slot += 1) {
        const project = projects.find(({ projectName }) => projectName === composeProjectNameOf(slot));
        if (project !== undefined)
          slots.set(slot, { isOwn: isSameDirectory(project.workingDirectory, projectDirectory) });
      }
      return slots;
    },
    isPortFree,
  };
}
