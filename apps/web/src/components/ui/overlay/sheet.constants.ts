import { em } from 'enumwaii';

const sheetSidesEnumwaii = em(['TOP', 'RIGHT', 'BOTTOM', 'LEFT']);

export const SHEET_SIDES = sheetSidesEnumwaii.enum;
export type SheetSide = (typeof sheetSidesEnumwaii)['~type'];

export const SHEET_SIDE_DATA_VALUES = sheetSidesEnumwaii.derive(
  [SHEET_SIDES.TOP, 'top'],
  [SHEET_SIDES.RIGHT, 'right'],
  [SHEET_SIDES.BOTTOM, 'bottom'],
  [SHEET_SIDES.LEFT, 'left'],
);
