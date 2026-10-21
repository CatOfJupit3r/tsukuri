import { templatePath } from '#~/constants/template-path';
import { CAPABILITIES } from '#~/enums/capabilities.enums';
import { CONNECTION_POINT_KINDS } from '#~/enums/connection-point-kinds.enums';
import { MARKDOWN_DOCUMENTS } from '#~/enums/files/markdown-documents.enums';
import { HTTP_METHODS } from '#~/enums/http-methods.enums';
import { MODULE_CATEGORIES } from '#~/enums/module-categories.enums';
import { MODULE_IDS } from '#~/enums/module-ids.enums';
import { defineModule } from '#~/manifest/define-module';

const API_WORKSPACE = 'packages/api';
const CONTRACT_WORKSPACE = 'packages/server-contract';
const COMMON_WORKSPACE = 'packages/common';
const AUTH_FEATURE = '#~/features/auth';

const ERROR_CODES = [
  ['UNAUTHORIZED', 'User is not authenticated'],
  ['USER_NOT_FOUND', 'User not found'],
  ['DEV_IMPERSONATION_NOT_ALLOWED', 'Dev impersonation is not allowed in production'],
  ['IMPERSONATION_SESSION_CREATION_FAILED', 'Failed to create impersonation session'],
] as const;

/** Names and `.env.example` values of the variables `better-auth.env.ts` validates. */
const ENV_VARIABLES = [
  ['BETTER_AUTH_SECRET', 'replace-with-a-random-secret-of-32-chars'],
  ['BETTER_AUTH_URL', 'http://localhost:5050'],
  ['AUTH_TRUSTED_ORIGINS', 'http://localhost:3030'],
  ['AUTH_COOKIE_SECURE', 'false'],
  ['AUTH_COOKIE_SAME_SITE', 'lax'],
] as const;

export const betterAuthModule = defineModule({
  id: MODULE_IDS.BETTER_AUTH,
  version: '1.0.0',
  name: 'Better Auth',
  description: 'Email and password auth with Better Auth on the installed database, sessions in the API context',
  category: MODULE_CATEGORIES.AUTH,
  requires: [MODULE_IDS.API],
  // Auth needs an HTTP API, so a local-only app without a backend target cannot install it.
  requiresCapabilities: [CAPABILITIES.DATABASE, CAPABILITIES.BACKEND_TARGET],
  files: [
    // The tables come from the glue module of the installed database.
    { source: `${API_WORKSPACE}/src/features/auth`, exclude: ['auth.schema.ts'] },
    { source: `${API_WORKSPACE}/test/helpers/auth-users.ts` },
    { source: `${API_WORKSPACE}/test/helpers/plaintext-auth-password-hasher.ts` },
    { source: `${API_WORKSPACE}/test/helpers/setup/auth.setup.ts` },
    { source: `${API_WORKSPACE}/test/integration/auth.test.ts` },
    { source: `${API_WORKSPACE}/test/unit/auth-context.test.ts` },
    { source: `${CONTRACT_WORKSPACE}/src/contract/auth.contract.ts` },
    { source: `${CONTRACT_WORKSPACE}/src/contract/auth.procedures.ts` },
  ],
  packageJson: [
    {
      workspace: API_WORKSPACE,
      dependencies: {
        '@better-auth/drizzle-adapter': '1.6.23',
        'better-auth': 'catalog:',
      },
    },
  ],
  pnpmWorkspace: {
    catalog: {
      'better-auth': '1.6.23',
    },
  },
  markdown: [{ document: MARKDOWN_DOCUMENTS.AGENTS, source: templatePath('fragments/better-auth/agents.md.hbs') }],
  contributions: [
    {
      kind: CONNECTION_POINT_KINDS.CONTRACT,
      workspace: CONTRACT_WORKSPACE,
      key: 'auth',
      contract: { name: 'authContract', from: '../contract/auth.contract' },
    },
    {
      kind: CONNECTION_POINT_KINDS.ROUTER,
      workspace: API_WORKSPACE,
      key: 'auth',
      router: { name: 'authRouter', from: `${AUTH_FEATURE}/auth.router` },
    },
    {
      kind: CONNECTION_POINT_KINDS.CONTEXT_PROVIDER,
      workspace: API_WORKSPACE,
      provider: { name: 'provideAuthSession', from: `${AUTH_FEATURE}/auth.context` },
    },
    {
      kind: CONNECTION_POINT_KINDS.HTTP_HANDLER,
      workspace: API_WORKSPACE,
      path: '/auth',
      methods: [HTTP_METHODS.GET, HTTP_METHODS.POST],
      handler: { name: 'handleAuthRequest', from: `${AUTH_FEATURE}/auth.http` },
    },
    {
      kind: CONNECTION_POINT_KINDS.HTTP_HANDLER,
      workspace: API_WORKSPACE,
      path: '/dev-tools/impersonate',
      methods: [HTTP_METHODS.GET],
      handler: { name: 'handleDevImpersonateRequest', from: `${AUTH_FEATURE}/dev-impersonate/dev-impersonate.http` },
    },
    {
      kind: CONNECTION_POINT_KINDS.DATABASE_SCHEMA,
      workspace: API_WORKSPACE,
      key: 'auth',
      from: `${AUTH_FEATURE}/auth.schema`,
    },
    {
      kind: CONNECTION_POINT_KINDS.DI_REGISTRATION,
      workspace: API_WORKSPACE,
      bindings: [
        {
          token: { name: 'AUTH_USER_REPOSITORY_TOKEN', from: `${AUTH_FEATURE}/auth.tokens` },
          implementation: {
            name: 'DrizzleAuthUserRepository',
            from: `${AUTH_FEATURE}/users/drizzle-auth-user.repository`,
          },
        },
      ],
    },
    {
      kind: CONNECTION_POINT_KINDS.ENV_SHAPE,
      workspace: API_WORKSPACE,
      shape: { name: 'betterAuthEnvShape', from: `${AUTH_FEATURE}/env/better-auth.env` },
    },
    ...ENV_VARIABLES.map(([name, example]) => ({
      kind: CONNECTION_POINT_KINDS.ENV_VARIABLE,
      workspace: API_WORKSPACE,
      name,
      example,
    })),
    ...ERROR_CODES.map(([code, message]) => ({
      kind: CONNECTION_POINT_KINDS.ERROR_CODE,
      workspace: COMMON_WORKSPACE,
      code,
      message,
    })),
  ],
});
