import z from 'zod';

/** Read by the backend targets that serve this API over HTTP, not by the API itself. */
export const corsEnvShape = {
  CORS_ORIGIN: z.url().or(z.literal('')).default(''),
} satisfies Record<string, z.ZodType>;
