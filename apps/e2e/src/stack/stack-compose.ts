import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { iStack } from './claim-stack';
import { readPortEntries, readPublishedPort, withPublishedPort } from './published-ports';
import type { iStackService } from './stack-definition';
import { E2E_WORKSPACE_DIRECTORY, PROJECT_ROOT_DIRECTORY } from './stack-paths';

const VOLUME_SEPARATOR = ':';
const BIND_MOUNT_TYPE = 'bind';

function isHostPath(source: string) {
  return source.startsWith('.') || source.startsWith('/') || path.isAbsolute(source);
}

/**
 * Keeps bind mounts, resolved against the project root the dev compose file sits in, and drops named volumes:
 * a stack starts from empty services every time.
 */
function toStackVolume(volume: unknown): unknown[] {
  if (typeof volume === 'string') {
    const [source = '', ...rest] = volume.split(VOLUME_SEPARATOR);
    if (!isHostPath(source)) return [];
    return [[path.resolve(PROJECT_ROOT_DIRECTORY, source), ...rest].join(VOLUME_SEPARATOR)];
  }
  if (typeof volume !== 'object' || volume === null || Reflect.get(volume, 'type') !== BIND_MOUNT_TYPE) return [];
  const source: unknown = Reflect.get(volume, 'source');
  return typeof source === 'string' ? [{ ...volume, source: path.resolve(PROJECT_ROOT_DIRECTORY, source) }] : [];
}

/** A dev service as the slot runs it: on the slot's ports, without fixed container names or persistent volumes. */
function toStackServiceDefinition({ definition }: iStackService, portMap: ReadonlyMap<number, number>) {
  const { container_name: _containerName, volumes, ...rest } = definition;
  const ports = readPortEntries(definition).map((entry) => {
    const devPort = readPublishedPort(entry);
    const slotPort = devPort === null ? undefined : portMap.get(devPort);
    return slotPort === undefined ? entry : withPublishedPort(entry, slotPort);
  });
  const stackVolumes = Array.isArray(volumes) ? volumes.flatMap((volume: unknown) => toStackVolume(volume)) : [];

  return {
    ...rest,
    ...(ports.length > 0 ? { ports } : {}),
    ...(stackVolumes.length > 0 ? { volumes: stackVolumes } : {}),
  };
}

export function buildComposeDocument(stack: iStack) {
  return {
    name: stack.composeProjectName,
    services: Object.fromEntries(
      stack.definition.services.map((service) => [service.name, toStackServiceDefinition(service, stack.portMap)]),
    ),
  };
}

function composeFilePath(stack: iStack) {
  return path.join(stack.stateDirectory, 'compose.json');
}

/** Writes the slot's compose file; JSON is YAML, so compose reads it as is. */
export async function writeComposeFile(stack: iStack) {
  await mkdir(stack.stateDirectory, { recursive: true });
  await writeFile(composeFilePath(stack), `${JSON.stringify(buildComposeDocument(stack), null, 2)}\n`);
}

/** `docker` arguments that run a compose command on the slot's project. */
export function buildComposeArguments(stack: iStack, ...composeArguments: string[]) {
  return [
    'compose',
    '--project-name',
    stack.composeProjectName,
    '--project-directory',
    E2E_WORKSPACE_DIRECTORY,
    '--file',
    composeFilePath(stack),
    ...composeArguments,
  ];
}
