import { oc } from '@orpc/contract';
import z from 'zod';

const metrics = oc
  .route({
    path: '/metrics',
    method: 'GET',
  })
  .output(
    z.object({
      totalUsers: z.number().int().nonnegative(),
      activeSessions: z.number().int().nonnegative(),
    }),
  );

const devToolsListAllUsers = oc
  .route({
    method: 'GET',
    path: '/dev-tools/users',
  })
  .output(
    z.array(
      z.object({
        id: z.string(),
        name: z.string(),
      }),
    ),
  );

export const authContract = oc.router({
  metrics,
  devToolsListAllUsers,
});
