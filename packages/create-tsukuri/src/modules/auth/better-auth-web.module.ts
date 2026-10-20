import { CONNECTION_POINT_KINDS } from '#~/enums/connection-point-kinds.enums';
import { MODULE_CATEGORIES } from '#~/enums/module-categories.enums';
import { MODULE_IDS } from '#~/enums/module-ids.enums';
import { WEB_SLOTS } from '#~/enums/web-slots.enums';
import { defineModule } from '#~/manifest/define-module';

import { WEB_WORKSPACE } from '../web/web.module';

const AUTH_FEATURE = '#~/features/auth';

export const betterAuthWebModule = defineModule({
  id: MODULE_IDS.BETTER_AUTH_WEB,
  version: '1.0.0',
  name: 'Better Auth web client',
  description: 'Sign-in and sign-up pages, signed-in route guard, user menu and the dev impersonation panel',
  category: MODULE_CATEGORIES.BASE,
  autoInclude: { modules: [MODULE_IDS.WEB, MODULE_IDS.BETTER_AUTH] },
  files: [
    { source: `${WEB_WORKSPACE}/src/features/auth` },
    { source: `${WEB_WORKSPACE}/src/routes/_auth_only.tsx` },
    { source: `${WEB_WORKSPACE}/src/routes/_auth_only/dashboard.tsx` },
    { source: `${WEB_WORKSPACE}/src/routes/(general)` },
  ],
  packageJson: [
    {
      workspace: WEB_WORKSPACE,
      dependencies: {
        'better-auth': 'catalog:',
      },
    },
  ],
  pnpmWorkspace: {
    catalog: {
      'better-auth': '1.6.23',
    },
  },
  contributions: [
    {
      kind: CONNECTION_POINT_KINDS.WEB_COMPONENT,
      workspace: WEB_WORKSPACE,
      slot: WEB_SLOTS.HEADER_NAVIGATION,
      component: { name: 'DashboardNavLink', from: `${AUTH_FEATURE}/components/dashboard-nav-link` },
    },
    {
      kind: CONNECTION_POINT_KINDS.WEB_COMPONENT,
      workspace: WEB_WORKSPACE,
      slot: WEB_SLOTS.HEADER_ACTIONS,
      component: { name: 'UserMenu', from: `${AUTH_FEATURE}/components/user-menu` },
    },
    {
      kind: CONNECTION_POINT_KINDS.WEB_COMPONENT,
      workspace: WEB_WORKSPACE,
      slot: WEB_SLOTS.HOME_SECTIONS,
      component: { name: 'AuthHomeSection', from: `${AUTH_FEATURE}/components/auth-home-section` },
    },
    {
      kind: CONNECTION_POINT_KINDS.WEB_ROOT_PRELOAD,
      workspace: WEB_WORKSPACE,
      preload: { name: 'preloadMe', from: `${AUTH_FEATURE}/auth.preloads` },
    },
    {
      kind: CONNECTION_POINT_KINDS.WEB_DEVTOOLS_PLUGIN,
      workspace: WEB_WORKSPACE,
      plugin: { name: 'devImpersonateDevtoolsPlugin', from: `${AUTH_FEATURE}/dev-tools/dev-impersonate.devtools` },
    },
  ],
});
