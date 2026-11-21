import { em } from 'enumwaii';

/** Answers to the `auth-session-store` option; each is the default `AUTH_SESSION_STORE` it writes into the env schema. */
export const authSessionStoresEnumwaii = em({ DATABASE: 'database', KV_CACHE: 'kv-cache' });

export const AUTH_SESSION_STORES = authSessionStoresEnumwaii.enum;
export type AuthSessionStore = (typeof authSessionStoresEnumwaii)['~type'];

interface iAuthSessionStoreMeta {
  label: string;
  hint: string;
  /** The `AUTH_SESSION_STORES` member the env schema defaults to. */
  enumMember: string;
}

export const AUTH_SESSION_STORE_META = authSessionStoresEnumwaii.derive<iAuthSessionStoreMeta>()(
  [
    AUTH_SESSION_STORES.DATABASE,
    {
      label: 'Database only',
      hint: 'a revoked or signed-out session stops working immediately',
      enumMember: 'DATABASE',
    },
  ],
  [
    AUTH_SESSION_STORES.KV_CACHE,
    {
      label: 'KV session cache',
      hint: 'faster edge reads, but a revoked or signed-out session can stay valid for about 60 seconds',
      enumMember: 'KV_CACHE',
    },
  ],
);
