import type z from 'zod';

import { NODE_ENVIRONMENTS, nodeEnvironmentSchema } from '#~/constants/node-environments.enums';

export const apiEnvShape = {
  NODE_ENV: nodeEnvironmentSchema.default(NODE_ENVIRONMENTS.DEVELOPMENT),
} satisfies Record<string, z.ZodType>;
