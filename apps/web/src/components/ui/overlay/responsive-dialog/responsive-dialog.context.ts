import { createContext, use } from 'react';

export const ResponsiveDialogModeContext = createContext(false);

export function useIsResponsiveDialogDrawer(): boolean {
  return use(ResponsiveDialogModeContext);
}
