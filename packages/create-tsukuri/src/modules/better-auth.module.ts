import { BETTER_AUTH_SECRET_VARIABLE } from '#~/constants/better-auth-secret';
import { templatePath } from '#~/constants/template-path';
import {
  AUTH_SESSION_STORE_META,
  AUTH_SESSION_STORES,
  authSessionStoresEnumwaii,
} from '#~/enums/auth-session-stores.enums';
import { CAPABILITIES } from '#~/enums/capabilities.enums';
import { CONNECTION_POINT_KINDS } from '#~/enums/connection-point-kinds.enums';
import { HTTP_METHODS } from '#~/enums/http-methods.enums';
import { MARKDOWN_DOCUMENTS } from '#~/enums/markdown-documents.enums';
import { MODULE_CATEGORIES } from '#~/enums/module-categories.enums';
import { MODULE_IDS } from '#~/enums/module-ids.enums';
import { MODULE_OPTION_IDS } from '#~/enums/module-option-ids.enums';
import { defineModule } from '#~/manifest/define-module';

import { API_WORKSPACE } from './api.module';

const CONTRACT_WORKSPACE = 'packages/server-contract';
const COMMON_WORKSPACE = 'packages/common';
const AUTH_FEATURE = '#~/features/auth';

const AUTH_SESSION_STORES_FILE = `${AUTH_FEATURE}/auth-session-stores.enums`;

const ERROR_CODES = [
  ['UNAUTHORIZED', 'User is not authenticated'],
  ['USER_NOT_FOUND', 'User not found'],
  ['DEV_IMPERSONATION_NOT_ALLOWED', 'Dev impersonation is not allowed in production'],
  ['IMPERSONATION_SESSION_CREATION_FAILED', 'Failed to create impersonation session'],
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
    { source: `${API_WORKSPACE}/test/integration/auth-client-ip.test.ts` },
    { source: `${API_WORKSPACE}/test/integration/auth-service-config.test.ts` },
    { source: `${API_WORKSPACE}/test/integration/dev-impersonation.test.ts` },
    { source: `${API_WORKSPACE}/test/unit/auth-secret-task.test.ts` },
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
      methods: [HTTP_METHODS.POST],
      handler: { name: 'handleDevImpersonateRequest', from: `${AUTH_FEATURE}/dev-impersonate.http` },
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
          implementation: { name: 'DrizzleAuthUserRepository', from: `${AUTH_FEATURE}/drizzle-auth-user.repository` },
        },
      ],
    },
    {
      kind: CONNECTION_POINT_KINDS.ENV_VARIABLE,
      workspace: API_WORKSPACE,
      name: BETTER_AUTH_SECRET_VARIABLE,
      schema: 'z.string().min(32)',
      // `create` writes a random secret into the local `.env`; production refuses this placeholder.
      example: 'replace-with-a-random-secret-of-32-chars',
    },
    {
      kind: CONNECTION_POINT_KINDS.ENV_VARIABLE,
      workspace: API_WORKSPACE,
      name: 'TRUSTED_IP_HEADER',
      schema: 'z.string().transform((header) => header || undefined).optional()',
      example: '',
      comment:
        'Behind a proxy that sets the real client address (for example x-forwarded-for), name that header so rate limits see it. Unset trusts no header: Node uses the socket address, a Worker uses cf-connecting-ip.',
    },
    {
      kind: CONNECTION_POINT_KINDS.STARTUP_TASK,
      workspace: API_WORKSPACE,
      task: { name: 'AuthSecretTask', from: `${AUTH_FEATURE}/auth-secret.task` },
    },
    {
      kind: CONNECTION_POINT_KINDS.ENV_VARIABLE,
      workspace: API_WORKSPACE,
      name: 'BETTER_AUTH_URL',
      schema: 'z.url()',
      example: 'http://localhost:5050',
    },
    {
      kind: CONNECTION_POINT_KINDS.ENV_VARIABLE,
      workspace: API_WORKSPACE,
      name: 'AUTH_COOKIE_SECURE',
      schema: 'z.stringbool().default(false)',
      example: 'false',
    },
    {
      kind: CONNECTION_POINT_KINDS.ENV_VARIABLE,
      workspace: API_WORKSPACE,
      name: 'AUTH_COOKIE_SAME_SITE',
      schema: 'authCookieSameSiteSchema.default(AUTH_COOKIE_SAME_SITES.LAX)',
      imports: [
        { name: 'authCookieSameSiteSchema', from: `${AUTH_FEATURE}/auth-cookie-same-site.enums` },
        { name: 'AUTH_COOKIE_SAME_SITES', from: `${AUTH_FEATURE}/auth-cookie-same-site.enums` },
      ],
      example: 'lax',
    },
    ...ERROR_CODES.map(([code, message]) => ({
      kind: CONNECTION_POINT_KINDS.ERROR_CODE,
      workspace: COMMON_WORKSPACE,
      code,
      message,
    })),
  ],
  options: [
    {
      id: MODULE_OPTION_IDS.AUTH_SESSION_STORE,
      message: 'Where Better Auth reads sessions on Cloudflare KV',
      defaultValue: AUTH_SESSION_STORES.DATABASE,
      appliesWithModules: [MODULE_IDS.CLOUDFLARE_KV],
      // The choice is the default of AUTH_SESSION_STORE, which can be changed later in the env.
      choices: authSessionStoresEnumwaii.values.map((store) => {
        const { label, hint, enumMember } = AUTH_SESSION_STORE_META.get(store);
        return {
          value: store,
          label,
          hint,
          contributions: [
            {
              kind: CONNECTION_POINT_KINDS.ENV_VARIABLE,
              workspace: API_WORKSPACE,
              name: 'AUTH_SESSION_STORE',
              schema: `authSessionStoreSchema.default(AUTH_SESSION_STORES.${enumMember})`,
              imports: [
                { name: 'authSessionStoreSchema', from: AUTH_SESSION_STORES_FILE },
                { name: 'AUTH_SESSION_STORES', from: AUTH_SESSION_STORES_FILE },
              ],
              example: store,
            },
          ],
        };
      }),
    },
  ],
});
