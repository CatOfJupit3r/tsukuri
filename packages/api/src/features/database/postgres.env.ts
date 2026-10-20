import z from 'zod';

export const postgresEnvShape = {
  POSTGRES_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/startername'),
} satisfies Record<string, z.ZodType>;
