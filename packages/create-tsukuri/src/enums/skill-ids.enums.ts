import { em } from 'enumwaii';
import { emToZodSchema } from 'enumwaii/zod';

/** Values are the folder names under `.agents/skills/`. */
const skillIdsEnumwaii = em({
  REVIEW_CODE: 'review-code',
  SERVER_MODULE: 'server-module',
  DEPENDENCY_INJECTION_SETUP: 'dependency-injection-setup',
  SERVER_ERROR_HANDLING: 'server-error-handling',
  SERVER_ROUTER_IMPLEMENTATION: 'server-router-implementation',
  SERVER_TESTING: 'server-testing',
  ORPC_CONTRACT_CREATION: 'orpc-contract-creation',
  DRIZZLE_ORM: 'drizzle-orm',
  REACT_COMPONENT_PATTERNS: 'react-component-patterns',
  TANSTACK_FORMS: 'tanstack-forms',
  TANSTACK_QUERY_INTEGRATION: 'tanstack-query-integration',
});

export const SKILL_IDS = skillIdsEnumwaii.enum;
export type SkillId = (typeof skillIdsEnumwaii)['~type'];
export const skillIdSchema = emToZodSchema(skillIdsEnumwaii);
