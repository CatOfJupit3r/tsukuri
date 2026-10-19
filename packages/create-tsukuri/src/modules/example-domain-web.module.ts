import { CONNECTION_POINT_KINDS } from '#~/enums/connection-point-kinds.enums';
import { MODULE_CATEGORIES } from '#~/enums/module-categories.enums';
import { MODULE_IDS } from '#~/enums/module-ids.enums';
import { WEB_SLOTS } from '#~/enums/web-slots.enums';
import { defineModule } from '#~/manifest/define-module';

import { WEB_WORKSPACE } from './web.module';

const PROFILE_MENU_ITEMS = '#~/features/user/components/profile-menu-items';

export const exampleDomainWebModule = defineModule({
  id: MODULE_IDS.EXAMPLE_DOMAIN_WEB,
  version: '1.0.0',
  name: 'Example domain web pages',
  description: 'Profile and settings pages with badges and achievements',
  category: MODULE_CATEGORIES.BASE,
  autoInclude: { modules: [MODULE_IDS.WEB, MODULE_IDS.EXAMPLE_DOMAIN] },
  files: [
    { source: `${WEB_WORKSPACE}/src/features/achievements` },
    { source: `${WEB_WORKSPACE}/src/features/badges` },
    { source: `${WEB_WORKSPACE}/src/features/user` },
    { source: `${WEB_WORKSPACE}/src/routes/_auth_only/profile.tsx` },
    { source: `${WEB_WORKSPACE}/src/routes/_auth_only/settings.tsx` },
  ],
  contributions: [
    {
      kind: CONNECTION_POINT_KINDS.WEB_COMPONENT,
      workspace: WEB_WORKSPACE,
      slot: WEB_SLOTS.USER_MENU_ITEMS,
      component: { name: 'ProfileMenuItem', from: PROFILE_MENU_ITEMS },
    },
    {
      kind: CONNECTION_POINT_KINDS.WEB_COMPONENT,
      workspace: WEB_WORKSPACE,
      slot: WEB_SLOTS.USER_MENU_ITEMS,
      component: { name: 'SettingsMenuItem', from: PROFILE_MENU_ITEMS },
    },
  ],
});
