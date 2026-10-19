---
name: server-router-implementation
description: Implement oRPC router handlers on the server following contract definitions. Use when implementing API endpoints, connecting contracts to business logic, handling authenticated routes, registering new routers, or implementing business logic in handlers.
---

## Key rules

1. Router should ONLY call a service to do the business logic. It can shape the response, but should not contain business logic itself.
2. Use the contract to validate input. Do not validate manually in the handler. Runtime output validation is disabled (`initialOutputValidationIndex: Number.NaN` in `#~/lib/orpc`), so the contract's `.output()` types the handler's return value but does not enforce it.
3. Resolve services with `context.resolve(Service)`, never by importing the container into a handler.

## Step-by-step procedure

### 1. Create the router file

Routers live with their feature: `packages/api/src/features/<feature>/<feature>.router.ts`. Do not add routers to `apps/server`; it only forwards requests to the shared API.

The router is built on `base` from `#~/lib/orpc`, which is `implement(CONTRACT)` with the API context. The namespace (`myNamespace`) is the key the contract and router are registered under (step 4), and each procedure is implemented from `publicProcedure.<namespace>.<procedure>`; there is no `.use(contract...)` step.

Basic structure:

```typescript
import { protectedProcedure } from '#~/features/auth/auth.procedures';
import { base, publicProcedure } from '#~/lib/orpc';

import { MyNamespaceService } from './my-namespace.service';

export const myNamespaceRouter = base.myNamespace.router({
  myPublicProcedure: publicProcedure.myNamespace.myPublicProcedure.handler(async ({ context }) =>
    context.resolve(MyNamespaceService).listPublic(),
  ),

  myProtectedProcedure: protectedProcedure.myNamespace.myProtectedProcedure.handler(async ({ input, context }) => {
    // context.session is never null here
    const userId = context.session.user.id;
    return context.resolve(MyNamespaceService).processForUser(input, userId);
  }),
});
```

Name the export `<feature>Router` and keep it a named export.

### 2. Choose the right procedure type

#### Public procedure

Use `publicProcedure` from `#~/lib/orpc` for endpoints that don't require authentication. It already applies the unexpected-error boundary, so unknown failures are normalized to an `INTERNAL_SERVER_ERROR`:

```typescript
publicProcedure.achievements.listAchievements.handler(async ({ context }) =>
  context.resolve(AchievementsService).listAllAchievements(),
);
```

#### Protected procedure

Use `protectedProcedure` from `#~/features/auth/auth.procedures` (available when the better-auth module is installed) for endpoints that require authentication. It is `publicProcedure` plus a middleware that throws `ORPCUnauthorizedError(errorCodes.UNAUTHORIZED)` without a session, so inside the handler `context.session` is non-null:

```typescript
protectedProcedure.user.getUserProfile.handler(async ({ context }) => {
  const userId = context.session.user.id;
  return context.resolve(UserService).getUserProfile(userId);
});
```

The matching contract procedure starts from `authProcedure` (see the `orpc-contract-creation` skill). When a procedure needs its own middleware, extend `publicProcedure.use(...)`, as `protectedProcedure` does, so the error boundary stays in place.

### 3. Use services via dependency injection

Resolve services in the handler with `context.resolve`, which resolves from a container created for the request:

```typescript
import { protectedProcedure } from '#~/features/auth/auth.procedures';

import { NotificationService } from './notification.service';

protectedProcedure.notifications.notifyUser.handler(async ({ input, context }) => {
  await context.resolve(NotificationService).send(input.userId, input.message);
  return { success: true };
});
```

Interface-backed dependencies (repositories, stores) are injected into services through their tokens; the handler resolves the service, not the repository.

### 4. Register the router

Do not edit `app-router.ts` or `src/generated/routers.ts`. `appRouter` is `base.router(generatedRouters)`, and the generated map is rebuilt from the module manifests. Declare a `ROUTER` contribution with the same `key` as the contract's `CONTRACT` contribution:

```typescript
{
  kind: CONNECTION_POINT_KINDS.ROUTER,
  workspace: 'packages/api',
  key: 'myNamespace',
  router: { name: 'myNamespaceRouter', from: '#~/features/my-namespace/my-namespace.router' },
},
```

See `packages/create-tsukuri/src/modules/example-domain.module.ts` and the `server-module` skill ("Wiring a feature"). In this repository run `pnpm run sync` afterwards. In a generated project add the entry to the generated router map the way the file shows (follow its header and the project's `AGENTS.md`); it is rebuilt from `starter.json` and the module manifests when modules are added or removed, so re-check it afterwards.

The router is then served by `ApiRequestHandler` over both REST (OpenAPI) and RPC (`/rpc`); nothing else needs mounting.
