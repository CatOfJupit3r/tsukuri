import { em } from 'enumwaii';

const dateChipStatusEnumwaii = em(['UPCOMING', 'DUE', 'OVERDUE', 'DONE']);

export const DATE_CHIP_STATUS = dateChipStatusEnumwaii.enum;
export type DateChipStatus = (typeof dateChipStatusEnumwaii)['~type'];

export const DATE_CHIP_CLASS = dateChipStatusEnumwaii.derive(
  [DATE_CHIP_STATUS.UPCOMING, 'bg-muted text-muted-foreground'],
  [DATE_CHIP_STATUS.DUE, 'bg-primary/10 text-primary'],
  [DATE_CHIP_STATUS.OVERDUE, 'bg-destructive/10 text-destructive'],
  [DATE_CHIP_STATUS.DONE, 'bg-muted text-muted-foreground line-through'],
);
