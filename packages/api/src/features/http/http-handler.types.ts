/** A request handler a module serves outside the API router, such as an auth provider's endpoints. */
export type iHttpHandle = (request: Request) => Promise<Response>;
