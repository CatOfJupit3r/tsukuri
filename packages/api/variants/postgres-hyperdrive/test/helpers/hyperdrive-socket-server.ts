import { initializeTestPostgres } from '#test/helpers/postgres-memory';
import type { Hyperdrive } from '@cloudflare/workers-types';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';

const MAXIMUM_CONNECTIONS = 50;
const LOCAL_HOST = '127.0.0.1';

/** Connections the socket server accepted, and how many of them are still open. */
export interface iSocketConnectionCounts {
  opened: number;
  active: number;
}

export interface iHyperdriveSocketServer {
  /** What a Worker's `HYPERDRIVE` binding holds, pointing at the socket server. */
  hyperdrive: Hyperdrive;
  connectionCounts: () => iSocketConnectionCounts;
  /** Drops every open connection and stops accepting new ones. */
  stop: () => Promise<void>;
}

export async function startHyperdriveSocketServer(): Promise<iHyperdriveSocketServer> {
  const { $client } = await initializeTestPostgres();
  const server = new PGLiteSocketServer({
    db: $client,
    host: LOCAL_HOST,
    port: 0,
    maxConnections: MAXIMUM_CONNECTIONS,
  });
  let opened = 0;
  server.addEventListener('connection', () => {
    opened += 1;
  });
  await server.start();
  const { hostname: host, port } = new URL(`postgresql://postgres:postgres@${server.getServerConn()}/postgres`);

  return {
    hyperdrive: {
      connectionString: `postgresql://postgres:postgres@${host}:${port}/postgres`,
      host,
      ip: host,
      port: Number(port),
      user: 'postgres',
      password: 'postgres',
      database: 'postgres',
      connect: () => {
        throw new Error('Tests reach the database through the connection string');
      },
    },
    connectionCounts: () => ({ opened, active: server.getStats().activeConnections }),
    stop: async () => server.stop(),
  };
}

let hyperdriveSocketServer: Promise<iHyperdriveSocketServer> | undefined;

/** The shared server: one per test process, in front of the same in-memory database the other module tests use. */
export async function getHyperdriveSocketServer() {
  hyperdriveSocketServer ??= startHyperdriveSocketServer();
  return hyperdriveSocketServer;
}
