import z from 'zod';

import { CONNECTION_POINT_KINDS, connectionPointKindSchema } from '#~/enums/connection-point-kinds.enums';
import { httpMethodSchema } from '#~/enums/http-methods.enums';

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

/** One entry in the workspace's generated contract map: `key: exportName`. */
export const contractContributionSchema = z.object({
  kind: z.literal(CONNECTION_POINT_KINDS.CONTRACT),
  workspace: workspaceSchema,
  key: identifierSchema,
  contract: namedImportSchema,
});

/** A class with `run()`, resolved from the container and run once on startup, after the tasks of required modules. */
export const startupTaskContributionSchema = z.object({
  kind: z.literal(CONNECTION_POINT_KINDS.STARTUP_TASK),
  workspace: workspaceSchema,
  task: namedImportSchema,
});

/** A `(request: Request) => Promise<Response>` served for every path under `path`, outside the API router. */
export const httpHandlerContributionSchema = z.object({
  kind: z.literal(CONNECTION_POINT_KINDS.HTTP_HANDLER),
  workspace: workspaceSchema,
  path: z.string().regex(/^(\/[\w-]+)+$/, 'A path prefix such as "/auth", without a trailing slash'),
  methods: z.array(httpMethodSchema).min(1),
  handler: namedImportSchema,
});

/** A `(request: Request) => Promise<object>` whose result is merged into every API request context. */
export const contextProviderContributionSchema = z.object({
  kind: z.literal(CONNECTION_POINT_KINDS.CONTEXT_PROVIDER),
  workspace: workspaceSchema,
  provider: namedImportSchema,
});

/** A module whose exported tables and relations join the workspace's database schema. */
export const databaseSchemaContributionSchema = z.object({
  kind: z.literal(CONNECTION_POINT_KINDS.DATABASE_SCHEMA),
  workspace: workspaceSchema,
  key: identifierSchema,
  from: importSpecifierSchema,
});

/** A member of the workspace's generated error code enum, with its default message. */
export const errorCodeContributionSchema = z.object({
  kind: z.literal(CONNECTION_POINT_KINDS.ERROR_CODE),
  workspace: workspaceSchema,
  code: z.string().regex(/^[A-Z][A-Z0-9_]*$/, 'Error codes are CONSTANT_CASE'),
  message: z.string().min(1),
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
  /** Named imports the schema expression uses, such as an enumwaii zod schema. */
  imports: z.array(namedImportSchema).default([]),
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

/**
 * A connection point a module's own code imports, so its file is generated for the workspace even
 * when no installed module contributes to it yet.
 */
export const connectionPointHostSchema = z.object({
  kind: connectionPointKindSchema,
  workspace: workspaceSchema,
});

export const connectionPointContributionSchema = z.discriminatedUnion('kind', [
  routerContributionSchema,
  contractContributionSchema,
  diRegistrationContributionSchema,
  startupTaskContributionSchema,
  httpHandlerContributionSchema,
  contextProviderContributionSchema,
  databaseSchemaContributionSchema,
  errorCodeContributionSchema,
  envVariableContributionSchema,
  composeServiceContributionSchema,
  ciStepContributionSchema,
  devTaskContributionSchema,
  buildTaskContributionSchema,
]);

export type iConnectionPointContribution = z.output<typeof connectionPointContributionSchema>;
export type iConnectionPointHost = z.output<typeof connectionPointHostSchema>;

type iWithDefaults<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/** What a manifest author writes; fields with schema defaults are optional. */
export type iConnectionPointContributionInput =
  | iRouterContribution
  | iContractContribution
  | iWithDefaults<iDiRegistrationContribution, 'imports' | 'bindings'>
  | iStartupTaskContribution
  | iHttpHandlerContribution
  | iContextProviderContribution
  | iDatabaseSchemaContribution
  | iErrorCodeContribution
  | iWithDefaults<iEnvVariableContribution, 'imports' | 'example'>
  | iWithDefaults<iComposeServiceContribution, 'volumes'>
  | iWithDefaults<iCiStepContribution, 'env'>
  | iDevTaskContribution
  | iBuildTaskContribution;
export type iRouterContribution = z.output<typeof routerContributionSchema>;
export type iContractContribution = z.output<typeof contractContributionSchema>;
export type iStartupTaskContribution = z.output<typeof startupTaskContributionSchema>;
export type iHttpHandlerContribution = z.output<typeof httpHandlerContributionSchema>;
export type iContextProviderContribution = z.output<typeof contextProviderContributionSchema>;
export type iDatabaseSchemaContribution = z.output<typeof databaseSchemaContributionSchema>;
export type iErrorCodeContribution = z.output<typeof errorCodeContributionSchema>;
export type iDiRegistrationContribution = z.output<typeof diRegistrationContributionSchema>;
export type iEnvVariableContribution = z.output<typeof envVariableContributionSchema>;
export type iComposeServiceContribution = z.output<typeof composeServiceContributionSchema>;
export type iCiStepContribution = z.output<typeof ciStepContributionSchema>;
export type iDevTaskContribution = z.output<typeof devTaskContributionSchema>;
export type iBuildTaskContribution = z.output<typeof buildTaskContributionSchema>;
