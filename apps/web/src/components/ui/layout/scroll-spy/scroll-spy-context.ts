import { createContext, use } from 'react';

export interface iScrollSpyContext {
  activeValue: string;
  registerSection: (value: string, element: HTMLElement) => () => unknown;
  scrollToSection: (value: string) => unknown;
}

export const ScrollSpyContext = createContext<iScrollSpyContext | undefined>(undefined);

export function useScrollSpyContext() {
  const context = use(ScrollSpyContext);
  if (!context) throw new Error('Scroll Spy components must be rendered inside ScrollSpy.');
  return context;
}
