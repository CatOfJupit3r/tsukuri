import z from 'zod';

export const sqliteEnvShape = {
  // Every app runs from `apps/<name>` or `packages/<name>`, so this is `data/` at the project root.
  SQLITE_PATH: z.string().default('../../data/startername.db'),
} satisfies Record<string, z.ZodType>;
