---
name: orpc-contract-creation
description: Create new oRPC contracts in packages/server-contract following project conventions. Use when adding new API endpoints, defining RPC procedures, extending existing contract namespaces, or creating fully typed client-server communication contracts.
---

# oRPC Contract Creation

**See [examples/complete-contract.ts](examples/complete-contract.ts) for a complete example with multiple procedures.**

## How it works

oRPC contracts are the single source of truth for both REST/OpenAPI and RPC layers. They live in `packages/server-contract/src/contract/` (package `@startername/server-contract`) and must be properly typed with Zod schemas. The API in `packages/api` implements them (`implement(CONTRACT)` in `#~/lib/orpc`), and clients consume them.

## Step-by-step procedure

### 1. Define the contract file

Create a new file in `packages/server-contract/src/contract/<feature>.contract.ts`.

Basic structure: build each procedure as a named constant, then export one namespace router with a path prefix. Import `oc` from `@orpc/contract` (not `@orpc/server`):

```typescript
import { oc } from '@orpc/contract';
import z from 'zod';

import { authProcedure } from './auth.procedures';

const myPublicProcedure = oc
  .route({
    method: 'GET',
    path: '/public',
    summary: 'Brief one-line description',
    description: 'Detailed description of what this endpoint does',
  })
  .output(z.object({ result: z.string() }));

// Start from authProcedure for authenticated routes
const myProtectedProcedure = authProcedure
  .route({
    method: 'POST',
    path: '/my-procedure',
    summary: 'Brief one-line description',
    description: 'Detailed description of what this endpoint does',
  })
  .input(z.object({ param: z.string() }))
  .output(z.object({ result: z.string() }));

export const myNamespaceContract = oc.prefix('/my-namespace').router({
  myPublicProcedure,
  myProtectedProcedure,
});
```

Route paths are relative to the `prefix`, so the paths above are served at `/my-namespace/public` and `/my-namespace/my-procedure`. Use `{param}` for path parameters (`/{id}`), not `:param`.

### 2. Choose the right procedure type

- **Public routes**: Start from `oc` - these are accessible without authentication
- **Authenticated routes**: Start from `authProcedure` (`./auth.procedures`, present when the better-auth module is installed) instead of `oc` - it tags the procedure with `auth: 'USER'` metadata. The tag only documents the requirement: implement the procedure with `protectedProcedure`, which rejects requests without a session (see the `server-router-implementation` skill)

### 3. Reuse schemas

Define schemas reused inside one contract as constants at the top of the file (`USER_PROFILE_SCHEMA` in `user.contract.ts`). When the server also needs the schema or its values, define it in `packages/common/src/constants/` (an enumwaii declaration plus `emToZodSchema`, as `BadgeIdSchema` in `badges.ts`) and import it from `@startername/common/constants/<name>`:

```typescript
import { BadgeIdSchema } from '@startername/common/constants/badges';

const BADGE_META_SCHEMA = z.object({
  id: BadgeIdSchema,
  label: z.string(),
});
```

### 4. Register the contract

Do not edit `app.contract.ts` or `src/generated/contracts.ts`. `CONTRACT` is built from the generated map, which the generator rebuilds from module manifests. Declare a `CONTRACT` contribution and the matching `ROUTER` contribution with the same `key`; the key becomes the namespace (`appRouter.<key>`, `base.<key>.router`):

```typescript
{
  kind: CONNECTION_POINT_KINDS.CONTRACT,
  workspace: 'packages/server-contract',
  key: 'user',
  contract: { name: 'userContract', from: '../contract/user.contract' },
},
{
  kind: CONNECTION_POINT_KINDS.ROUTER,
  workspace: 'packages/api',
  key: 'user',
  router: { name: 'userRouter', from: '#~/features/user/user.router' },
},
```

See `packages/create-tsukuri/src/modules/example-domain.module.ts`. In this repository run `pnpm run sync` after changing a manifest. In a generated project the entry belongs in the generated contract map the way the file shows (follow its header and the project's `AGENTS.md`); that file is rebuilt from `starter.json` and the module manifests whenever modules are added or removed, so re-check it afterwards.

### 5. Validate the contract

Run verification to ensure everything compiles:

```bash
pnpm run verify
```

## Contract conventions

### Naming
- Use camelCase for procedure names: `getUserProfile`, `listChallenges`
- Use kebab-case for URL paths: `/user-profile`, `/list-challenges`
- Namespace contracts match their domain and are named exports: `userContract`, `challengeContract`

### Documentation
- Always include `summary` (one line, used in OpenAPI docs)
- Always include `description` (detailed explanation of behavior)
- Document edge cases and special behaviors in the description

### Input/Output schemas
- Use explicit Zod schemas for all inputs and outputs
- Never use `.passthrough()` or `.any()` - be explicit about shape
- Validate at the contract level, not just in handlers
- The API validates input against the contract. Runtime output validation is off (`initialOutputValidationIndex: Number.NaN` in `#~/lib/orpc`), so `.output()` types the handler's return value but does not reject it

### Error responses
- Contracts don't define error schemas - these are handled by error wrappers
- All error codes are declared by modules as `ERROR_CODE` contributions and generated into `@startername/common/generated/error-codes`
- Handlers use custom error wrappers from `#~/lib/orpc-error-wrapper` (in `packages/api`)
- Import error codes via: `import { errorCodes } from '@startername/common/generated/error-codes';`

## Common patterns

### Pagination
```typescript
.input(
  z.object({
    limit: z.number().min(1).max(100).default(20),
    offset: z.number().min(0).default(0),
  })
)
```

### ID parameters
```typescript
.input(
  z.object({
    id: z.uuid(),
  })
)
```

### Optional filters
```typescript
.input(
  z.object({
    search: z.string().optional(),
    status: recordStatusSchema.optional(), // emToZodSchema(...) of an enumwaii declaration
  })
)
```
