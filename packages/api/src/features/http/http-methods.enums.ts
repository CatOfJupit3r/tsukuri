import { em } from 'enumwaii';

export const httpMethodsEnumwaii = em(['GET', 'HEAD', 'OPTIONS', 'POST', 'PUT', 'PATCH', 'DELETE']);

export const HTTP_METHODS = httpMethodsEnumwaii.enum;
export type HttpMethod = (typeof httpMethodsEnumwaii)['~type'];

interface iHttpMethodMeta {
  /** Reads only, so no cross-site request can change state through it. */
  isSafe: boolean;
}

export const HTTP_METHOD_META = httpMethodsEnumwaii.derive<iHttpMethodMeta>()(
  [HTTP_METHODS.GET, { isSafe: true }],
  [HTTP_METHODS.HEAD, { isSafe: true }],
  [HTTP_METHODS.OPTIONS, { isSafe: true }],
  [HTTP_METHODS.POST, { isSafe: false }],
  [HTTP_METHODS.PUT, { isSafe: false }],
  [HTTP_METHODS.PATCH, { isSafe: false }],
  [HTTP_METHODS.DELETE, { isSafe: false }],
);
