import path from 'node:path';

/**
 * Local data (such as SQLite files) lives in the project's `data/` folder, which every app reaches as `../../data/`
 * from its own workspace.
 */
const DEV_DATA_PREFIX = '../../data/';

/** A port after the start of a value or a colon, as in `5050` or `http://localhost:5050/path`. */
const PORT_PATTERN = /(^|:)(\d{1,5})(?!\d)/g;

export interface iStackEnvironmentInput {
  exampleEnvironment: Record<string, string>;
  /** The environment the stack was started from; it fills in what the example leaves to the developer. */
  baseEnvironment: NodeJS.ProcessEnv;
  portMap: ReadonlyMap<number, number>;
  /** The slot's data folder, relative to the project root. */
  dataDirectory: string;
}

function movePorts(value: string, portMap: ReadonlyMap<number, number>) {
  return value.replace(PORT_PATTERN, (match, prefix: string, port: string) => {
    const slotPort = portMap.get(Number(port));
    return slotPort === undefined ? match : `${prefix}${slotPort}`;
  });
}

function moveData(value: string, dataDirectory: string) {
  if (!value.startsWith(DEV_DATA_PREFIX)) return value;
  return `../../${path.posix.join(dataDirectory.split(path.sep).join('/'), value.slice(DEV_DATA_PREFIX.length))}`;
}

function definedEntries(environment: NodeJS.ProcessEnv) {
  return Object.entries(environment).flatMap(([key, value]) => (value === undefined ? [] : [[key, value] as const]));
}

/**
 * The environment of a slot's stack: the project's `.env.example` with every dev port and the data folder moved to
 * the slot's own. Moved values always win; the rest can be overridden by the environment the stack starts from,
 * and the developer's `.env` no longer applies to any variable `.env.example` lists.
 */
export function buildStackEnvironment({
  exampleEnvironment,
  baseEnvironment,
  portMap,
  dataDirectory,
}: iStackEnvironmentInput): Record<string, string> {
  const movedEntries = Object.entries(exampleEnvironment).flatMap(([key, value]) => {
    const moved = moveData(movePorts(value, portMap), dataDirectory);
    return moved === value ? [] : [[key, moved] as const];
  });

  return {
    ...exampleEnvironment,
    ...Object.fromEntries(definedEntries(baseEnvironment)),
    ...Object.fromEntries(movedEntries),
  };
}
