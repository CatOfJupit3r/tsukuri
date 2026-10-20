import z from 'zod';

export const nodeHonoEnvShape = {
  SERVER_PORT: z.coerce.number().int().min(1).max(65535).default(5050),
  SERVER_HOST: z.string().default('localhost'),
} satisfies Record<string, z.ZodType>;
