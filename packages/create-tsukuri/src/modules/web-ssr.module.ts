import { CAPABILITIES } from '#~/enums/capabilities.enums';
import { MODULE_CATEGORIES } from '#~/enums/module-categories.enums';
import { MODULE_IDS } from '#~/enums/module-ids.enums';
import { defineModule } from '#~/manifest/define-module';

import { WEB_WORKSPACE } from './web.module';

export const webSsrModule = defineModule({
  id: MODULE_IDS.WEB_SSR,
  version: '1.0.0',
  name: 'TanStack Start (SSR)',
  description: 'Server-rendered web app on TanStack Start',
  category: MODULE_CATEGORIES.WEB,
  requires: [MODULE_IDS.WEB],
  provides: [CAPABILITIES.WEB_RENDERING],
  files: [
    { source: `${WEB_WORKSPACE}/vite.config.ts` },
    { source: `${WEB_WORKSPACE}/src/router.tsx` },
    { source: `${WEB_WORKSPACE}/src/routes/__root.tsx` },
    { source: `${WEB_WORKSPACE}/src/components/themes/theme-storage.ts` },
  ],
  packageJson: [
    {
      workspace: WEB_WORKSPACE,
      dependencies: {
        '@tanstack/react-router-ssr-query': '1.167.1',
        '@tanstack/react-start': '1.168.27',
      },
    },
  ],
});
