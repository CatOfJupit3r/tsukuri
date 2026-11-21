/** A `fetch` the server render may use instead of the network, for a backend that runs in its own process. */
export type iServerRenderFetch = (
  input: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1],
) => Promise<Response>;
