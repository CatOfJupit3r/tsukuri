import {
  INTERNAL_RENDER_SECRET_COMMENT,
  INTERNAL_RENDER_SECRET_EXAMPLE,
  INTERNAL_RENDER_SECRET_VARIABLE,
} from '#~/constants/internal-render-secret';
import { CAPABILITIES } from '#~/enums/capabilities.enums';
import { CONNECTION_POINT_KINDS } from '#~/enums/connection-point-kinds.enums';
import { MODULE_CATEGORIES } from '#~/enums/module-categories.enums';
import { MODULE_IDS } from '#~/enums/module-ids.enums';
import { defineModule } from '#~/manifest/define-module';

import { API_WORKSPACE } from './api.module';
import { WEB_WORKSPACE } from './web.module';

const RENDER_SECRET_FEATURE = '#~/features/render-secret';
const SECRET_SCHEMA = 'z.string().min(32)';

/**
 * A server-rendering web app and an API server in different processes cannot tell the render's session lookups
 * from a visitor's by wiring, so both share a secret the render sends and the API verifies.
 */
export const ssrRenderSecretModule = defineModule({
  id: MODULE_IDS.SSR_RENDER_SECRET,
  version: '1.0.0',
  name: 'SSR render secret',
  description: 'Lets the server render of a web app prove itself to a separately running API with a shared secret',
  category: MODULE_CATEGORIES.BASE,
  autoInclude: {
    modules: [MODULE_IDS.BETTER_AUTH, MODULE_IDS.WEB_SSR],
    capabilities: [CAPABILITIES.REMOTE_BACKEND],
  },
  files: [
    { source: `${API_WORKSPACE}/src/features/render-secret` },
    { source: `${API_WORKSPACE}/test/unit/internal-render-secret-task.test.ts` },
    { source: `${API_WORKSPACE}/test/unit/internal-render-secret-authenticator.test.ts` },
    { source: `${WEB_WORKSPACE}/test/utils/server-env.test.ts` },
  ],
  contributions: [
    {
      kind: CONNECTION_POINT_KINDS.ENV_VARIABLE,
      workspace: API_WORKSPACE,
      name: INTERNAL_RENDER_SECRET_VARIABLE,
      schema: SECRET_SCHEMA,
      example: INTERNAL_RENDER_SECRET_EXAMPLE,
      comment: INTERNAL_RENDER_SECRET_COMMENT,
    },
    {
      kind: CONNECTION_POINT_KINDS.ENV_VARIABLE,
      workspace: WEB_WORKSPACE,
      name: INTERNAL_RENDER_SECRET_VARIABLE,
      schema: SECRET_SCHEMA,
      example: INTERNAL_RENDER_SECRET_EXAMPLE,
      comment: INTERNAL_RENDER_SECRET_COMMENT,
    },
    {
      kind: CONNECTION_POINT_KINDS.DI_REGISTRATION,
      workspace: API_WORKSPACE,
      bindings: [
        {
          token: { name: 'SERVER_RENDER_AUTHENTICATOR_TOKEN', from: '#~/features/http/server-render-authenticator' },
          implementation: {
            name: 'InternalRenderSecretAuthenticator',
            from: `${RENDER_SECRET_FEATURE}/internal-render-secret.authenticator`,
          },
        },
      ],
    },
    {
      kind: CONNECTION_POINT_KINDS.STARTUP_TASK,
      workspace: API_WORKSPACE,
      task: { name: 'InternalRenderSecretTask', from: `${RENDER_SECRET_FEATURE}/internal-render-secret.task` },
    },
  ],
});
