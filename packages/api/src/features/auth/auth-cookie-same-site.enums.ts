import { em } from 'enumwaii';
import { emToZodSchema } from 'enumwaii/zod';

/** Values are the cookie `SameSite` attribute. */
const authCookieSameSitesEnumwaii = em({ LAX: 'lax', STRICT: 'strict', NONE: 'none' });

export const AUTH_COOKIE_SAME_SITES = authCookieSameSitesEnumwaii.enum;
export type AuthCookieSameSite = (typeof authCookieSameSitesEnumwaii)['~type'];
export const authCookieSameSiteSchema = emToZodSchema(authCookieSameSitesEnumwaii);
