import { generatedRouters } from '#~/generated/routers';
import { base } from '#~/lib/orpc';

export const appRouter = base.router(generatedRouters);

export type AppRouter = typeof appRouter;
