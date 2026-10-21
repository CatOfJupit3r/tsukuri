/**
 * A compose `ports` entry: `"HOST:CONTAINER"`, `"IP:HOST:CONTAINER"` (an IPv6 host IP in brackets), a bare container
 * port or the long syntax.
 */
type ComposePortEntry = string | number | Record<string, unknown>;

const PORT_SEPARATOR = ':';
const PORT_RANGE_SEPARATOR = '-';
const IPV6_HOST_END = ']:';

interface iShortPortEntry {
  /** The host IP with its separator, as written: `""`, `"127.0.0.1:"` or `"[::1]:"`. */
  hostIpPrefix: string;
  hostPort: string | null;
  /** The container port with its protocol, as in `5432` or `53/udp`. */
  containerPort: string;
}

function isPortEntry(entry: unknown): entry is ComposePortEntry {
  return typeof entry === 'string' || typeof entry === 'number' || (typeof entry === 'object' && entry !== null);
}

function parseShortEntry(entry: string): iShortPortEntry {
  const ipv6End = entry.startsWith('[') ? entry.indexOf(IPV6_HOST_END) : -1;
  const ipv6Prefix = ipv6End === -1 ? '' : entry.slice(0, ipv6End + IPV6_HOST_END.length);
  const parts = entry.slice(ipv6Prefix.length).split(PORT_SEPARATOR);
  const containerPort = parts.at(-1) ?? '';
  if (parts.length === 1) return { hostIpPrefix: ipv6Prefix, hostPort: null, containerPort };
  const ipv4Prefix = parts
    .slice(0, -2)
    .map((part) => `${part}${PORT_SEPARATOR}`)
    .join('');
  return { hostIpPrefix: `${ipv6Prefix}${ipv4Prefix}`, hostPort: parts.at(-2) ?? null, containerPort };
}

/** A published host port as a number; a range cannot move to a slot, so it is refused. */
function toHostPort(rawPort: unknown, entry: ComposePortEntry) {
  if (rawPort === null || rawPort === undefined || rawPort === '') return null;
  const description = JSON.stringify(entry);
  if (typeof rawPort === 'string' && rawPort.includes(PORT_RANGE_SEPARATOR)) {
    throw new Error(`The E2E stack cannot move the port range ${description} to its slot; publish single ports.`);
  }
  const port = Number(rawPort);
  if (!Number.isInteger(port) || port <= 0) throw new Error(`${description} publishes no valid host port.`);
  return port;
}

/** The `ports` entries of a compose service definition. */
export function readPortEntries(service: Record<string, unknown>): ComposePortEntry[] {
  const { ports } = service;
  return Array.isArray(ports) ? ports.filter(isPortEntry) : [];
}

/** The host port an entry publishes on, or null when it publishes none. */
export function readPublishedPort(entry: ComposePortEntry) {
  if (typeof entry === 'number') return null;
  if (typeof entry === 'object') return toHostPort(entry.published, entry);
  return toHostPort(parseShortEntry(entry).hostPort, entry);
}

/** The entry published on `hostPort` instead, keeping its container port, protocol and host IP. */
export function withPublishedPort(entry: ComposePortEntry, hostPort: number): ComposePortEntry {
  if (typeof entry === 'number') return entry;
  if (typeof entry === 'object') return { ...entry, published: String(hostPort) };
  const { hostIpPrefix, containerPort } = parseShortEntry(entry);
  return `${hostIpPrefix}${hostPort}${PORT_SEPARATOR}${containerPort}`;
}
