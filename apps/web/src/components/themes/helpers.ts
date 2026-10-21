import { isOnClient } from '#~/utils/is-on-client';

import { THEME_CLASS_NAMES, USER_THEME } from './constants';
import type { AppTheme, UserTheme } from './constants';

export function getInitialThemeClass(theme: UserTheme): AppTheme {
  // SSR default is light when the theme is 'system'; client adjusts after mount.
  return theme === USER_THEME.DARK ? USER_THEME.DARK : USER_THEME.LIGHT;
}

export function getSystemTheme(): AppTheme {
  if (!isOnClient) return USER_THEME.DARK;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? USER_THEME.DARK : USER_THEME.LIGHT;
}

/** The class `<html>` renders with on the server, before the client resolves a system theme. */
export function getInitialThemeClassName(theme: UserTheme) {
  return THEME_CLASS_NAMES.get(getInitialThemeClass(theme));
}

export function handleThemeChange(theme: UserTheme) {
  const root = document.documentElement;
  root.classList.remove(THEME_CLASS_NAMES.get(USER_THEME.LIGHT), THEME_CLASS_NAMES.get(USER_THEME.DARK));
  const newTheme = theme === USER_THEME.SYSTEM ? getSystemTheme() : getInitialThemeClass(theme);
  root.classList.add(THEME_CLASS_NAMES.get(newTheme));
}

export function setupPreferredListener() {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = () => handleThemeChange(USER_THEME.SYSTEM);
  mediaQuery.addEventListener('change', handler);
  return () => mediaQuery.removeEventListener('change', handler);
}
