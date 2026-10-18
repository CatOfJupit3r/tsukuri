import { em } from 'enumwaii';

const fileChangeKindsEnumwaii = em(['CREATE', 'UPDATE', 'MERGE', 'DELETE', 'CONFLICT']);

export const FILE_CHANGE_KINDS = fileChangeKindsEnumwaii.enum;
export type FileChangeKind = (typeof fileChangeKindsEnumwaii)['~type'];

/** Marker printed before each planned change. */
export const FILE_CHANGE_MARKERS = fileChangeKindsEnumwaii.derive(
  [FILE_CHANGE_KINDS.CREATE, '+'],
  [FILE_CHANGE_KINDS.UPDATE, '~'],
  [FILE_CHANGE_KINDS.MERGE, 'm'],
  [FILE_CHANGE_KINDS.DELETE, '-'],
  [FILE_CHANGE_KINDS.CONFLICT, '!'],
);
