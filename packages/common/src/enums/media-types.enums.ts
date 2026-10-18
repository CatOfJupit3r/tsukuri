import { em } from 'enumwaii';
import { emToZodSchema } from 'enumwaii/zod';

/** MIME types for payloads, downloads and uploads the application produces or accepts. */
const mediaTypesEnumwaii = em({
  JSON: 'application/json',
  OCTET_STREAM: 'application/octet-stream',
  ZIP: 'application/zip',
  GZIP: 'application/gzip',
  PNG: 'image/png',
  JPEG: 'image/jpeg',
  WEBP: 'image/webp',
  GIF: 'image/gif',
  SVG: 'image/svg+xml',
  PLAIN_TEXT: 'text/plain',
});

export const MEDIA_TYPES = mediaTypesEnumwaii.enum;
export type MediaType = (typeof mediaTypesEnumwaii)['~type'];
export const mediaTypeSchema = emToZodSchema(mediaTypesEnumwaii);
