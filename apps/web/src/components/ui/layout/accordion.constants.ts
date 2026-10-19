import { em } from 'enumwaii';

const accordionTypesEnumwaii = em(['SINGLE', 'MULTIPLE']);

export const ACCORDION_TYPES = accordionTypesEnumwaii.enum;
export type AccordionType = (typeof accordionTypesEnumwaii)['~type'];
