import { createServerFn } from '@tanstack/react-start';
import { getCookie, setCookie } from '@tanstack/react-start/server';

import { THEME_COOKIE, userThemeValidator } from './constants';

/** The theme lives in a cookie, so the server renders the page in it. */
export const getStoredTheme = createServerFn().handler(async () => userThemeValidator.parse(getCookie(THEME_COOKIE)));

export const setStoredTheme = createServerFn({ method: 'POST' })
  .validator((data: unknown) => userThemeValidator.parse(data))
  .handler(({ data }) => {
    setCookie(THEME_COOKIE, String(data));
  });
