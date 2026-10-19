import { createContext, useContext } from 'react';

/**
 * Where menus, popovers, tooltips and select lists render. They go to the end of the page by default; a surface
 * that takes the whole screen, such as an element in full screen, supplies itself so they stay visible there.
 */
export const PortalContainerContext = createContext<HTMLElement | null>(null);

export function usePortalContainer() {
  return useContext(PortalContainerContext);
}
