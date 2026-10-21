import z from 'zod';

import { AUTH_COOKIE_SAME_SITES, authCookieSameSiteSchema } from '#~/features/auth/env/auth-cookie-same-site.enums';

export const betterAuthEnvShape = {
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  // Comma-separated origins of the web apps that sign in through this API; empty for same-origin apps.
  AUTH_TRUSTED_ORIGINS: z
    .string()
    .default('')
    .transform((origins) =>
      origins
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
  AUTH_COOKIE_SECURE: z.stringbool().default(false),
  AUTH_COOKIE_SAME_SITE: authCookieSameSiteSchema.default(AUTH_COOKIE_SAME_SITES.LAX),
} satisfies Record<string, z.ZodType>;
