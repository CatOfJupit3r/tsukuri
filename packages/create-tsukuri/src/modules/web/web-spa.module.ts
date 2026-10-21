import { CAPABILITIES } from '#~/enums/capabilities.enums';
import { MODULE_CATEGORIES } from '#~/enums/module-categories.enums';
import { MODULE_IDS } from '#~/enums/module-ids.enums';
import { defineModule } from '#~/manifest/define-module';

import { WEB_WORKSPACE } from './web.module';

const SPA_VARIANT = `${WEB_WORKSPACE}/variants/spa`;

/** SPA files live next to the SSR app in this repository and replace its entry points in a project. */
const SPA_FILES = [
  'index.html',
  'vite.config.ts',
  'src/main.tsx',
  'src/router.tsx',
  'src/routes/__root.tsx',
  'src/components/themes/theme-storage.ts',
  'src/utils/backend-url.ts',
];

export const webSpaModule = defineModule({
  id: MODULE_IDS.WEB_SPA,
  version: '1.0.0',
  name: 'Vite SPA',
  description: 'Client-rendered single-page app on Vite and TanStack Router',
  category: MODULE_CATEGORIES.WEB,
  requires: [MODULE_IDS.WEB],
  provides: [CAPABILITIES.WEB_RENDERING],
  files: SPA_FILES.map((file) => ({ source: `${SPA_VARIANT}/${file}`, target: `${WEB_WORKSPACE}/${file}` })),
  packageJson: [
    {
      workspace: WEB_WORKSPACE,
      devDependencies: {
        '@tanstack/router-plugin': '1.168.19',
      },
    },
  ],
});
