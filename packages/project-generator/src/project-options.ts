import { Enumwaii  } from '@startername/enumwaii/enumwaii';
import type {InferEnumwaii} from '@startername/enumwaii/enumwaii';

const projectPartsEnumwaii = new Enumwaii('GeneratedProjectPart', ['SERVER', 'WEB']);

export const PROJECT_PARTS = projectPartsEnumwaii.enum;
export type ProjectPart = InferEnumwaii<typeof projectPartsEnumwaii>;
export const projectPartSchema = projectPartsEnumwaii.schema;

export function parseProjectPart(value: string): ProjectPart {
  return projectPartsEnumwaii.parse(value.toUpperCase());
}
