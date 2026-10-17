import { em } from 'enumwaii';
import { emToZodSchema } from 'enumwaii/zod';

/** Values are the folder names under `.agents/skills/`. */
const skillIdsEnumwaii = em({
  REVIEW_CODE: 'review-code',
});

export const SKILL_IDS = skillIdsEnumwaii.enum;
export type SkillId = (typeof skillIdsEnumwaii)['~type'];
export const skillIdSchema = emToZodSchema(skillIdsEnumwaii);
