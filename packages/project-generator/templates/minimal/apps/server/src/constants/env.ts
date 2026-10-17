import z from 'zod';

const serverEnvironmentSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65_535).default(5050),
});

export const ENV = serverEnvironmentSchema.parse(process.env);
