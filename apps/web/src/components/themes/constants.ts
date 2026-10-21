import { em } from 'enumwaii';
import { emToZodSchema } from 'enumwaii/zod';

const userThemeEnumwaii = em(['LIGHT', 'DARK', 'SYSTEM']);
export const USER_THEME = userThemeEnumwaii.enum;
export const userThemeValidator = emToZodSchema(userThemeEnumwaii).catch(USER_THEME.DARK);

export type UserTheme = (typeof userThemeEnumwaii)['~type'];
export type AppTheme = typeof USER_THEME.LIGHT | typeof USER_THEME.DARK;

export const THEME_COOKIE = 'startername.theme';

/**
 * The class `<html>` carries for each theme: the stylesheet's `dark` variant and dark tokens select `.dark`. A system
 * theme renders light on the server until the client resolves it.
 */
export const THEME_CLASS_NAMES = userThemeEnumwaii.derive(
  [USER_THEME.LIGHT, 'light'],
  [USER_THEME.DARK, 'dark'],
  [USER_THEME.SYSTEM, 'light'],
);
