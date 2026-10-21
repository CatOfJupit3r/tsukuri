import net from 'node:net';

/** IPv4 and IPv6 loopback: `localhost` resolves to either, so a port is free only when both are. */
const LOOPBACK_HOSTS = ['127.0.0.1', '::1'];
/** The machine has no IPv6 (loopback), so nothing can listen there. */
const UNAVAILABLE_ADDRESS_CODES = new Set(['EADDRNOTAVAIL', 'EAFNOSUPPORT']);

async function canListen(port: number, host: string) {
  return new Promise<boolean>((resolve) => {
    const server = net.createServer();
    server.once('error', (error: NodeJS.ErrnoException) => resolve(UNAVAILABLE_ADDRESS_CODES.has(error.code ?? '')));
    server.listen({ port, host, exclusive: true }, () => {
      server.close(() => resolve(true));
    });
  });
}

export async function isPortFree(port: number) {
  const results = await Promise.all(LOOPBACK_HOSTS.map(async (host) => canListen(port, host)));
  return results.every(Boolean);
}
