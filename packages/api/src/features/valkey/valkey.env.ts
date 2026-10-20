import z from 'zod';

export const valkeyEnvShape = {
  VALKEY_HOST: z.string().default('localhost'),
  VALKEY_PORT: z.coerce.number().default(6379),
  VALKEY_USERNAME: z.string().optional(),
  VALKEY_PASSWORD: z.string().optional(),
  VALKEY_DB: z.coerce.number().int().default(0),
} satisfies Record<string, z.ZodType>;
