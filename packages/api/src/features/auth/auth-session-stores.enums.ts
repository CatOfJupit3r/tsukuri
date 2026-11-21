import { em } from 'enumwaii';
import { emToZodSchema } from 'enumwaii/zod';

/** Where Better Auth reads sessions on an eventually consistent key-value store; values are the `AUTH_SESSION_STORE` strings. */
const authSessionStoresEnumwaii = em({
  /** Only the database holds sessions, so a revoked or signed-out session stops working immediately. */
  DATABASE: 'database',
  /** The key-value store also caches sessions for faster edge reads; a revoked session can stay valid for about a minute. */
  KV_CACHE: 'kv-cache',
});

export const AUTH_SESSION_STORES = authSessionStoresEnumwaii.enum;
export type AuthSessionStore = (typeof authSessionStoresEnumwaii)['~type'];
export const authSessionStoreSchema = emToZodSchema(authSessionStoresEnumwaii);
