import { CAPABILITIES } from '#~/enums/capabilities.enums';
import { MODULE_CATEGORIES } from '#~/enums/module-categories.enums';
import { MODULE_IDS } from '#~/enums/module-ids.enums';
import { defineModule } from '#~/manifest/define-module';

import { WEB_WORKSPACE } from '../web/web.module';

const START_VARIANT = `${WEB_WORKSPACE}/variants/tanstack-start`;

const START_BACKEND_FILES = ['src/load-env.ts', 'src/routes/api/$.ts', 'src/utils/backend-url.ts'];

export const tanstackStartModule = defineModule({
  id: MODULE_IDS.TANSTACK_START,
  version: '1.0.0',
  name: 'TanStack Start server routes',
  description: 'The Start app serves the shared API under /api, with no separate server app',
  category: MODULE_CATEGORIES.BACKEND,
  requires: [MODULE_IDS.WEB_SSR, MODULE_IDS.API],
  provides: [CAPABILITIES.BACKEND_TARGET, CAPABILITIES.NODE_RUNTIME],
  files: START_BACKEND_FILES.map((file) => ({
    source: `${START_VARIANT}/${file}`,
    target: `${WEB_WORKSPACE}/${file}`,
  })),
  packageJson: [
    {
      workspace: WEB_WORKSPACE,
      dependencies: {
        '@startername/api': 'workspace:*',
        dotenv: 'catalog:',
        'reflect-metadata': '0.2.2',
      },
    },
  ],
  pnpmWorkspace: {
    catalog: {
      dotenv: '17.4.2',
    },
  },
});
