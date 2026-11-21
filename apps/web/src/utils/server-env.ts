import z from 'zod';

import { generatedEnvShape } from '#~/generated/env.schema';

/** The variables the dev server and the client build read themselves; every other variable is read by the server render. */
const BUILD_VARIABLES = { VITE_HOST: true, VITE_PORT: true } as const;

const serverEnvSchema = z.object(generatedEnvShape).omit(BUILD_VARIABLES);

/** Stops the server render from starting with a missing or malformed server-only variable, such as a shared secret. */
export function assertServerEnv(environment: Record<string, string | undefined>) {
  return serverEnvSchema.parse(environment);
}
