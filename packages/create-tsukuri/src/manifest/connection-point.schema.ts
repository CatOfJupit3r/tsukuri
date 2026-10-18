import z from 'zod';

import { CONNECTION_POINT_KINDS } from '@~/enums/connection-point-kinds.enums';

const workspaceSchema = z.string().min(1);
const identifierSchema = z.string().regex(/^[A-Za-z_$][\w$]*$/, 'Must be a valid TypeScript identifier');
const importSpecifierSchema = z.string().min(1);

const namedImportSchema = z.object({
  name: identifierSchema,
  from: importSpecifierSchema,
});

/** One entry in the workspace's generated router map: `key: exportName`. */
export const routerContributionSchema = z.object({
  kind: z.literal(CONNECTION_POINT_KINDS.ROUTER),
  workspace: workspaceSchema,
  key: identifierSchema,
  router: namedImportSchema,
});

/**
 * A side-effect import that registers decorated services, optionally followed by binding an
 * implementation to an injection token.
 */
export const diRegistrationContributionSchema = z.object({
  kind: z.literal(CONNECTION_POINT_KINDS.DI_REGISTRATION),
  workspace: workspaceSchema,
  imports: z.array(importSpecifierSchema).default([]),
  bindings: z
    .array(
      z.object({
        token: namedImportSchema,
        implementation: namedImportSchema,
      }),
    )
    .default([]),
});

export const envVariableContributionSchema = z.object({
  kind: z.literal(CONNECTION_POINT_KINDS.ENV_VARIABLE),
  workspace: workspaceSchema,
  name: z.string().regex(/^[A-Z][A-Z0-9_]*$/, 'Env variable names are CONSTANT_CASE'),
  /** zod expression for the variable, e.g. `z.string().url()`. */
  schema: z.string().min(1),
  /** Value written to the generated `.env.example`. */
  example: z.string().default(''),
});

export const composeServiceContributionSchema = z.object({
  kind: z.literal(CONNECTION_POINT_KINDS.COMPOSE_SERVICE),
  name: z.string().regex(/^[a-z][a-z0-9-]*$/),
  service: z.record(z.string(), z.unknown()),
  volumes: z.array(z.string()).default([]),
});

export const ciStepContributionSchema = z.object({
  kind: z.literal(CONNECTION_POINT_KINDS.CI_STEP),
  name: z.string().min(1),
  run: z.string().min(1),
  env: z.record(z.string(), z.string()).default({}),
});

/** A workspace started by the root `dev` script. */
export const devTaskContributionSchema = z.object({
  kind: z.literal(CONNECTION_POINT_KINDS.DEV_TASK),
  filter: z.string().min(1),
});

/** A workspace built (with its dependencies) by the root `build` script. */
export const buildTaskContributionSchema = z.object({
  kind: z.literal(CONNECTION_POINT_KINDS.BUILD_TASK),
  filter: z.string().min(1),
});

export const connectionPointContributionSchema = z.discriminatedUnion('kind', [
  routerContributionSchema,
  diRegistrationContributionSchema,
  envVariableContributionSchema,
  composeServiceContributionSchema,
  ciStepContributionSchema,
  devTaskContributionSchema,
  buildTaskContributionSchema,
]);

export type iConnectionPointContribution = z.output<typeof connectionPointContributionSchema>;

type iWithDefaults<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/** What a manifest author writes; fields with schema defaults are optional. */
export type iConnectionPointContributionInput =
  | iRouterContribution
  | iWithDefaults<iDiRegistrationContribution, 'imports' | 'bindings'>
  | iWithDefaults<iEnvVariableContribution, 'example'>
  | iWithDefaults<iComposeServiceContribution, 'volumes'>
  | iWithDefaults<iCiStepContribution, 'env'>
  | z.output<typeof devTaskContributionSchema>
  | z.output<typeof buildTaskContributionSchema>;
export type iRouterContribution = z.output<typeof routerContributionSchema>;
export type iDiRegistrationContribution = z.output<typeof diRegistrationContributionSchema>;
export type iEnvVariableContribution = z.output<typeof envVariableContributionSchema>;
export type iComposeServiceContribution = z.output<typeof composeServiceContributionSchema>;
export type iCiStepContribution = z.output<typeof ciStepContributionSchema>;
