import { CONNECTION_POINT_KINDS } from '#~/enums/connection-point-kinds.enums';
import { MODULE_CATEGORIES } from '#~/enums/module-categories.enums';
import { MODULE_IDS } from '#~/enums/module-ids.enums';
import { SKILL_IDS } from '#~/enums/skill-ids.enums';
import { WEB_SLOTS } from '#~/enums/web-slots.enums';
import { defineModule } from '#~/manifest/define-module';

import { WEB_WORKSPACE } from './web.module';

export const webApiModule = defineModule({
  id: MODULE_IDS.WEB_API,
  version: '1.0.0',
  name: 'Web API client',
  description: 'oRPC and TanStack Query client for the shared API',
  category: MODULE_CATEGORIES.BASE,
  autoInclude: { modules: [MODULE_IDS.WEB, MODULE_IDS.API] },
  files: [
    { source: `${WEB_WORKSPACE}/src/utils/orpc.ts` },
    { source: `${WEB_WORKSPACE}/src/utils/tanstack-orpc.ts` },
    { source: `${WEB_WORKSPACE}/src/hooks/queries/use-health-check.ts` },
    { source: `${WEB_WORKSPACE}/src/components/api-health-badge.tsx` },
    { source: `${WEB_WORKSPACE}/src/components/toastifications/orpc-toasts.ts` },
  ],
  packageJson: [
    {
      workspace: WEB_WORKSPACE,
      dependencies: {
        '@orpc/client': 'catalog:',
        '@orpc/contract': 'catalog:',
        '@orpc/tanstack-query': 'catalog:',
        '@startername/server-contract': 'workspace:*',
      },
    },
  ],
  pnpmWorkspace: {
    catalog: {
      '@orpc/client': '1.14.7',
      '@orpc/tanstack-query': '1.14.7',
    },
  },
  skills: [SKILL_IDS.TANSTACK_QUERY_INTEGRATION],
  contributions: [
    {
      kind: CONNECTION_POINT_KINDS.WEB_COMPONENT,
      workspace: WEB_WORKSPACE,
      slot: WEB_SLOTS.HOME_SECTIONS,
      component: { name: 'ApiHealthBadge', from: '#~/components/api-health-badge' },
    },
  ],
});
