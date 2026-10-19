import z from 'zod';

import { generatedEnvShape } from '#~/generated/env.schema';

const apiEnvSchema = z.object(generatedEnvShape);

const parsedEnv = apiEnvSchema.safeParse(process.env);
if (!parsedEnv.success) {
  console.error('Environment variables validation failure:', z.treeifyError(parsedEnv.error));
  throw new Error('Invalid environment variables');
}

/** The installed modules' variables, validated once. The running app loads the root `.env` before importing this. */
export const env = parsedEnv.data;
