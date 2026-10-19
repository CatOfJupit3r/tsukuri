import { em } from 'enumwaii';

const fieldLegendVariantsEnumwaii = em(['LEGEND', 'LABEL']);

export const FIELD_LEGEND_VARIANTS = fieldLegendVariantsEnumwaii.enum;
export type FieldLegendVariant = (typeof fieldLegendVariantsEnumwaii)['~type'];

export const FIELD_LEGEND_VARIANT_DATA_VALUES = fieldLegendVariantsEnumwaii.derive(
  [FIELD_LEGEND_VARIANTS.LEGEND, 'legend'],
  [FIELD_LEGEND_VARIANTS.LABEL, 'label'],
);
