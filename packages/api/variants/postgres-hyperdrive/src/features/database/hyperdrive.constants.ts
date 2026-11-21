/**
 * Connections each request's pool may open. Hyperdrive pools the real connections, and a Worker invocation
 * may hold six open connections at once; five leave one for other I/O while a query that runs inside a
 * transaction (on the pool, not the transaction) still gets a connection of its own.
 */
export const CONNECTIONS_PER_REQUEST = 5;
