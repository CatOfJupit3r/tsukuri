import { em } from 'enumwaii';

/** Line-based blocks of markdown fragments; values are the tag names. */
export const controlBlocksEnumwaii = em({
  PRIVATE: 'private',
});

export const CONTROL_BLOCKS = controlBlocksEnumwaii.enum;
export type ControlBlock = (typeof controlBlocksEnumwaii)['~type'];
