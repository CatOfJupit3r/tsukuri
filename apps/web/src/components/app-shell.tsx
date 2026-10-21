import { NuqsAdapter } from 'nuqs/adapters/react';
import type { ReactNode } from 'react';

import type { UserTheme } from '#~/components/themes/constants';
import { ThemeProvider } from '#~/components/themes/theme-provider';
import { ToasterContainer } from '#~/components/toastifications/toaster-container';

import { AppDevtools } from './app-devtools';
import { Header } from './header';

interface iAppShellProps {
  initialTheme: UserTheme;
  children: ReactNode;
}

/** Providers, header and devtools around every page, for both renderings. */
export function AppShell({ initialTheme, children }: iAppShellProps) {
  return (
    <ThemeProvider initialTheme={initialTheme}>
      <NuqsAdapter>
        <div className="grid h-svh grid-rows-[auto_1fr]">
          <Header />
          {children}
        </div>
        <ToasterContainer />
      </NuqsAdapter>
      <AppDevtools />
    </ThemeProvider>
  );
}
