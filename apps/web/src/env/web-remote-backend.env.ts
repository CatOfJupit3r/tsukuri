import z from 'zod';

export const webRemoteBackendEnvShape = {
  VITE_SERVER_URL: z.url(),
} satisfies Record<string, z.ZodType>;
