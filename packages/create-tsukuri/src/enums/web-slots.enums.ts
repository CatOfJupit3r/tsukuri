import { em } from 'enumwaii';
import { emToZodSchema } from 'enumwaii/zod';

/** Places in the web shell where modules render components; values are the keys of `generatedSlots`. */
export const webSlotsEnumwaii = em(['HEADER_NAVIGATION', 'HEADER_ACTIONS', 'USER_MENU_ITEMS', 'HOME_SECTIONS']);

export const WEB_SLOTS = webSlotsEnumwaii.enum;
export type WebSlot = (typeof webSlotsEnumwaii)['~type'];
export const webSlotSchema = emToZodSchema(webSlotsEnumwaii);
