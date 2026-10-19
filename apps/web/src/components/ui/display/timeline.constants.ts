import { em } from 'enumwaii';

const timelineStatusEnumwaii = em(['COMPLETED', 'ACTIVE', 'PENDING']);

export const TIMELINE_STATUS = timelineStatusEnumwaii.enum;
export type TimelineStatus = (typeof timelineStatusEnumwaii)['~type'];

export const TIMELINE_STATUS_DATA_VALUES = timelineStatusEnumwaii.derive(
  [TIMELINE_STATUS.COMPLETED, 'completed'],
  [TIMELINE_STATUS.ACTIVE, 'active'],
  [TIMELINE_STATUS.PENDING, 'pending'],
);
