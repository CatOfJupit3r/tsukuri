import { em } from 'enumwaii';

const scrollSpyStateEnumwaii = em(['ACTIVE', 'INACTIVE']);
export const SCROLL_SPY_STATE = scrollSpyStateEnumwaii.enum;

export const SCROLL_SPY_DATA_STATE = scrollSpyStateEnumwaii.derive(
  [SCROLL_SPY_STATE.ACTIVE, 'active'],
  [SCROLL_SPY_STATE.INACTIVE, 'inactive'],
);
