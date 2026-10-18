import { em } from 'enumwaii';
import { emToZodSchema } from 'enumwaii/zod';

const httpMethodsEnumwaii = em(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']);

export const HTTP_METHODS = httpMethodsEnumwaii.enum;
export type HttpMethod = (typeof httpMethodsEnumwaii)['~type'];
export const httpMethodSchema = emToZodSchema(httpMethodsEnumwaii);
