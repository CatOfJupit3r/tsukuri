export type DistributiveOmit<TUnion, TKey extends PropertyKey> = TUnion extends unknown ? Omit<TUnion, TKey> : never;
