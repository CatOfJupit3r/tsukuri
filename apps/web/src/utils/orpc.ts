import { createORPCClient, onError } from '@orpc/client';
import { RPCLink } from '@orpc/client/fetch';
import type { ContractRouterClient, InferContractRouterOutputs } from '@orpc/contract';

import type { CONTRACT } from '@startername/server-contract/app.contract';

import { createLogger } from '#~/lib/logging/logger';
import { getBackendURL, getForwardedRequestHeaders } from '#~/utils/backend-url';
import { isOnClient } from '#~/utils/is-on-client';

const ABORTED_MESSAGE = 'The operation was aborted';

const logger = createLogger('orpc');

const link = new RPCLink({
  url: () => getBackendURL('/rpc'),
  headers: () => getForwardedRequestHeaders(),
  fetch: async (url, options) => fetch(url, { ...options, credentials: 'include' }),
  interceptors: [
    onError((error) => {
      if (!isOnClient) return;
      if (error instanceof Error && error.message.includes(ABORTED_MESSAGE)) return;
      logger.error('Request to the API failed', error);
    }),
  ],
});

export const orpcClient: ContractRouterClient<typeof CONTRACT> = createORPCClient(link);

export type ORPCOutputs = InferContractRouterOutputs<typeof CONTRACT>;
