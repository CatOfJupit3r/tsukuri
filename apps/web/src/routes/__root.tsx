/// <reference types="vite/client" />
import { HeadContent, Outlet, Scripts, createRootRouteWithContext } from '@tanstack/react-router';

import { MEDIA_TYPES } from '@startername/common/enums/media-types.enums';

import { AppShell } from '#~/components/app-shell';
import { getInitialThemeClass } from '#~/components/themes/helpers';
import { loadRoot } from '#~/lib/root-loader';
import type { iRouterAppContext } from '#~/router-context';
import { seo } from '#~/utils/seo';

import appCss from '../index.css?url';

export const Route = createRootRouteWithContext<iRouterAppContext>()({
  loader: async ({ context }) => loadRoot(context),
  component: RootComponent,
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ...seo({
        title: 'startername',
        description: 'startername is a web application',
        image: '/social-preview.png',
      }),
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', type: MEDIA_TYPES.PNG, href: '/favicon/favicon-96x96.png', sizes: '96x96' },
      { rel: 'icon', type: MEDIA_TYPES.SVG, href: '/favicon/favicon.svg' },
      { rel: 'shortcut icon', href: '/favicon/favicon.ico' },
      { rel: 'apple-touch-icon', sizes: '180x180', href: '/favicon/apple-touch-icon.png' },
      { rel: 'manifest', href: '/favicon/site.webmanifest' },
    ],
  }),
});

function RootComponent() {
  const { initialTheme } = Route.useLoaderData();

  return (
    <html lang="en" className={getInitialThemeClass(initialTheme)} suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <AppShell initialTheme={initialTheme}>
          <Outlet />
        </AppShell>
        <Scripts />
      </body>
    </html>
  );
}
