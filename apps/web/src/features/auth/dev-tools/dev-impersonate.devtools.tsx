import { DevImpersonatePanel } from './dev-impersonate-panel';

export const devImpersonateDevtoolsPlugin = {
  id: 'dev-impersonate',
  name: 'Dev Impersonate',
  render: <DevImpersonatePanel />,
  defaultOpen: false,
};
