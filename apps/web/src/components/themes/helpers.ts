import { isOnClient } from '#~/utils/is-on-client';

import { USER_THEME } from './constants';
import type { AppTheme, UserTheme } from './constants';

export function getInitialThemeClass(theme: UserTheme): AppTheme {
  // SSR default is light when the theme is 'system'; client adjusts after mount.
  return theme === USER_THEME.DARK ? USER_THEME.DARK : USER_THEME.LIGHT;
}

export function getSystemTheme(): AppTheme {
  if (!isOnClient) return USER_THEME.DARK;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? USER_THEME.DARK : USER_THEME.LIGHT;
}

export function handleThemeChange(theme: UserTheme) {
  const root = document.documentElement;
  root.classList.remove(USER_THEME.LIGHT, USER_THEME.DARK);
  const newTheme = theme === USER_THEME.SYSTEM ? getSystemTheme() : getInitialThemeClass(theme);
  root.classList.add(String(newTheme));
}

export function setupPreferredListener() {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = () => handleThemeChange(USER_THEME.SYSTEM);
  mediaQuery.addEventListener('change', handler);
  return () => mediaQuery.removeEventListener('change', handler);
}
