/**
 * The header the backend adapter fills with the address it observed (the socket address on Node, `cf-connecting-ip`
 * on a Worker). `ApiRequestHandler` drops any value a client sends, so this one is never forged.
 */
export const CLIENT_IP_HEADER = 'x-client-ip-address';
