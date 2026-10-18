import { TanStackDevtools } from '@tanstack/react-devtools';
import { formDevtoolsPlugin } from '@tanstack/react-form-devtools';
import { ReactQueryDevtoolsPanel } from '@tanstack/react-query-devtools';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';
import type { ComponentProps } from 'react';

import { generatedDevtoolsPlugins } from '#~/generated/web-devtools-plugins';

const PLUGINS: ComponentProps<typeof TanStackDevtools>['plugins'] = [
  {
    name: 'TanStack Query',
    render: <ReactQueryDevtoolsPanel />,
    defaultOpen: true,
  },
  {
    name: 'TanStack Router',
    render: <TanStackRouterDevtoolsPanel />,
    defaultOpen: false,
  },
  ...generatedDevtoolsPlugins,
  formDevtoolsPlugin(),
];

export function AppDevtools() {
  return <TanStackDevtools plugins={PLUGINS} />;
}
