/** A compose `ports` entry: `"HOST:CONTAINER"`, `"IP:HOST:CONTAINER"`, a bare container port or the long syntax. */
type ComposePortEntry = string | number | Record<string, unknown>;

const PORT_SEPARATOR = ':';

function toPort(value: unknown) {
  const port = Number(value);
  return Number.isInteger(port) && port > 0 ? port : null;
}

function isPortEntry(entry: unknown): entry is ComposePortEntry {
  return typeof entry === 'string' || typeof entry === 'number' || (typeof entry === 'object' && entry !== null);
}

/** The `ports` entries of a compose service definition. */
export function readPortEntries(service: Record<string, unknown>): ComposePortEntry[] {
  const { ports } = service;
  return Array.isArray(ports) ? ports.filter(isPortEntry) : [];
}

/** The host port an entry publishes on, or null when it publishes none (or a range). */
export function readPublishedPort(entry: ComposePortEntry) {
  if (typeof entry === 'number') return null;
  if (typeof entry === 'object') return toPort(entry.published);
  const parts = entry.split(PORT_SEPARATOR);
  return parts.length < 2 ? null : toPort(parts.at(-2));
}

/** The entry published on `hostPort` instead, keeping its container port, protocol and host IP. */
export function withPublishedPort(entry: ComposePortEntry, hostPort: number): ComposePortEntry {
  if (typeof entry === 'number') return entry;
  if (typeof entry === 'object') return { ...entry, published: String(hostPort) };
  const parts = entry.split(PORT_SEPARATOR);
  return [...parts.slice(0, -2), String(hostPort), parts.at(-1)].join(PORT_SEPARATOR);
}
