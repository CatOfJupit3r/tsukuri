import { oc } from '@orpc/contract';
import z from 'zod';

const healthCheck = oc
  .route({
    path: '/health',
    method: 'GET',
  })
  .output(
    z.object({
      status: z.string(),
    }),
  );

export const indexContract = oc.router({
  healthCheck,
});
