import { createServerFn } from '@tanstack/react-start';
import { getCookie, setCookie } from '@tanstack/react-start/server';

import { isOnClient } from '#~/utils/ssr-helpers';

import { THEME_COOKIE, USER_THEME, userThemeValidator } from './constants';
import type { AppTheme, UserTheme } from './constants';

export const getStoredTheme = createServerFn().handler(async () => userThemeValidator.parse(getCookie(THEME_COOKIE)));

export function getInitialThemeClass(theme: UserTheme): AppTheme {
  // SSR default is light when the theme is 'system'; client adjusts after mount.
  return theme === USER_THEME.DARK ? USER_THEME.DARK : USER_THEME.LIGHT;
}

export const setStoredTheme = createServerFn({ method: 'POST' })
  .validator((data: unknown) => userThemeValidator.parse(data))
  .handler(({ data }) => {
    setCookie(THEME_COOKIE, String(data));
  });

export function getSystemTheme(): AppTheme {
  if (isOnClient) return USER_THEME.DARK;
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
