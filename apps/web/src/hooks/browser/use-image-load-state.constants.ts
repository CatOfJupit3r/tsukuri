import { em } from 'enumwaii';

const imageLoadStatesEnumwaii = em(['IDLE', 'LOADING', 'READY', 'ERROR']);

export const IMAGE_LOAD_STATES = imageLoadStatesEnumwaii.enum;
export type ImageLoadState = (typeof imageLoadStatesEnumwaii)['~type'];

export const IMAGE_LOAD_STATE_DATA_VALUES = imageLoadStatesEnumwaii.derive(
  [IMAGE_LOAD_STATES.IDLE, 'idle'],
  [IMAGE_LOAD_STATES.LOADING, 'loading'],
  [IMAGE_LOAD_STATES.READY, 'ready'],
  [IMAGE_LOAD_STATES.ERROR, 'error'],
);
