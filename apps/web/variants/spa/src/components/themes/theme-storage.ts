import type { UserTheme } from '#~/components/themes/constants';
import { THEME_COOKIE, userThemeValidator } from '#~/components/themes/constants';

/** Without a server render the theme lives in localStorage. */
export async function getStoredTheme() {
  return userThemeValidator.parse(localStorage.getItem(THEME_COOKIE));
}

export async function setStoredTheme({ data }: { data: UserTheme }) {
  localStorage.setItem(THEME_COOKIE, data);
}
