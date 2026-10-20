import z from 'zod';

export const webEnvShape = {
  VITE_HOST: z.string().default('localhost'),
  VITE_PORT: z.coerce.number().default(3030),
} satisfies Record<string, z.ZodType>;
