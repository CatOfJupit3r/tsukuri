import z from 'zod';

import { generatedEnvShape } from '#~/generated/env.schema';

const serverEnvSchema = z.object(generatedEnvShape);

const parsedEnv = serverEnvSchema.safeParse(process.env);
if (!parsedEnv.success) {
  console.error('Environment variables validation failure:', z.treeifyError(parsedEnv.error));
  throw new Error('Invalid environment variables');
}

export const env = parsedEnv.data;
