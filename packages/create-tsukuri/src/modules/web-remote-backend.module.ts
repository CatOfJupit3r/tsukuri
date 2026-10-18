import { CAPABILITIES } from '#~/enums/capabilities.enums';
import { CONNECTION_POINT_KINDS } from '#~/enums/connection-point-kinds.enums';
import { MODULE_CATEGORIES } from '#~/enums/module-categories.enums';
import { MODULE_IDS } from '#~/enums/module-ids.enums';
import { defineModule } from '#~/manifest/define-module';

import { WEB_WORKSPACE } from './web.module';

/** Where the separately running API server is; the dev server proxies `/api` there. */
export const webRemoteBackendModule = defineModule({
  id: MODULE_IDS.WEB_REMOTE_BACKEND,
  version: '1.0.0',
  name: 'Web to remote API',
  description: 'Points the web app at an API server running on its own',
  category: MODULE_CATEGORIES.BASE,
  autoInclude: { modules: [MODULE_IDS.WEB], capabilities: [CAPABILITIES.REMOTE_BACKEND] },
  contributions: [
    {
      kind: CONNECTION_POINT_KINDS.ENV_VARIABLE,
      workspace: WEB_WORKSPACE,
      name: 'VITE_SERVER_URL',
      schema: 'z.url()',
      example: 'http://localhost:5050',
    },
  ],
});

/** Server rendering calls the API server directly and forwards the visitor's cookies. */
export const webSsrRemoteBackendModule = defineModule({
  id: MODULE_IDS.WEB_SSR_REMOTE_BACKEND,
  version: '1.0.0',
  name: 'SSR to remote API',
  description: 'Backend URLs for server rendering against a separate API server',
  category: MODULE_CATEGORIES.BASE,
  autoInclude: { modules: [MODULE_IDS.WEB_SSR], capabilities: [CAPABILITIES.REMOTE_BACKEND] },
  files: [{ source: `${WEB_WORKSPACE}/src/utils/backend-url.ts` }],
});
