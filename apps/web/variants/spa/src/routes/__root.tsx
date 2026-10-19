import { Outlet, createRootRouteWithContext } from '@tanstack/react-router';

import { AppShell } from '#~/components/app-shell';
import { handleThemeChange } from '#~/components/themes/helpers';
import { loadRoot } from '#~/lib/root-loader';
import type { iRouterAppContext } from '#~/router-context';

export const Route = createRootRouteWithContext<iRouterAppContext>()({
  loader: async ({ context }) => {
    const root = await loadRoot(context);
    handleThemeChange(root.initialTheme);
    return root;
  },
  component: RootComponent,
});

function RootComponent() {
  const { initialTheme } = Route.useLoaderData();

  return (
    <AppShell initialTheme={initialTheme}>
      <Outlet />
    </AppShell>
  );
}
