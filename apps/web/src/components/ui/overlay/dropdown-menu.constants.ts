import { em } from 'enumwaii';

const dropdownMenuItemVariantsEnumwaii = em(['DEFAULT', 'DESTRUCTIVE']);

export const DROPDOWN_MENU_ITEM_VARIANTS = dropdownMenuItemVariantsEnumwaii.enum;
export type DropdownMenuItemVariant = (typeof dropdownMenuItemVariantsEnumwaii)['~type'];

export const DROPDOWN_MENU_ITEM_VARIANT_DATA_VALUES = dropdownMenuItemVariantsEnumwaii.derive(
  [DROPDOWN_MENU_ITEM_VARIANTS.DEFAULT, 'default'],
  [DROPDOWN_MENU_ITEM_VARIANTS.DESTRUCTIVE, 'destructive'],
);
