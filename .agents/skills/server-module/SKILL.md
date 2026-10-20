---
name: server-module
description: >
  Organize and implement server features as focused, nested modules with clear
  service, repository, resolver, schema, and router boundaries. Use when adding
  or refactoring server functionality under packages/api/src.
---

# Server modules

Every server feature lives in the runtime-agnostic workspace `packages/api`
(`@startername/api`). `apps/server` is only the Node/Hono adapter that forwards
requests to `ApiRequestHandler`; never add features, routers, or services there.

Use a feature-first module layout. Keep domain code under
`packages/api/src/features/<feature>/`; do not place feature services,
repositories, resolvers, or business types directly in `src/`.

Inside the package, import with Node subpath imports (`#~/features/...`,
`#~/lib/...`). They resolve against `packages/api/package.json`
(`"imports": { "#~/*": "./src/*.js" }`); never use tsconfig `paths` or `@~/`.

## Boundaries

- `<feature>.router.ts` is the transport adapter. It exports the feature's
  router (for example `userRouter = base.user.router({...})`), implements the
  contract's procedures from `publicProcedure` (`#~/lib/orpc`) or
  `protectedProcedure` (`#~/features/auth/auth.procedures`), calls a service
  through `context.resolve`, and may shape the response. Keep business logic out
  of routers; see the `server-router-implementation` skill.
- `*.service.ts` owns business workflows, policies, orchestration, and
  transactions that span repositories or external services. Services do not
  contain HTTP/oRPC concerns.
- `*.repository.ts` declares the persistence boundary as an `i`-prefixed
  interface. `drizzle-*.repository.ts` implements it with Drizzle and is the
  only feature layer that should know table-query details.
- `<feature>.tokens.ts` holds the feature's interface tokens
  (`USER_PROFILE_REPOSITORY_TOKEN`). Tokens live per feature; there is no
  central token file or container file. Services inject repositories by token.
- `*.resolver.ts` owns conversion from persistence rows into the feature's
  singular response shapes. Make resolvers `@singleton()` classes and inject
  them into repositories. Use `createRowResolver` rather than hand-writing
  field-by-field response mappers; follow the `drizzle-orm` skill for details.
- `*.types.ts` contains feature input and response types. Derive repository
  responses from Drizzle table inference with `Pick`, `Omit`, or intersections;
  do not duplicate database columns manually.
- `*.schema.ts` contains the feature's Drizzle tables, next to the feature that
  owns them. There is no `src/db/schema` folder. Transport schemas (Zod input
  and output shapes) belong in `packages/server-contract` contracts.
- `*.constants.ts` contains feature-local non-sensitive constants. Constants
  shared with the client belong in `packages/common/src/constants`.
- `*.task.ts` is a startup task implementing `iStartupTask` from
  `#~/features/startup/startup-task.types`: work done once before the API
  serves requests, such as connecting to a database or subscribing to events.
- `*.events.ts` declares the payload tokens of the events the feature emits
  (`definePayloadTokens`, see the `payload-tokens` skill); `*.cache-keys.ts`
  holds the feature's cache key builders.

The normal dependency direction is:

```text
oRPC contract -> router -> service -> repository interface -> Drizzle repository
                                                        -> resolver
```

Repositories may use resolvers for persistence-to-response conversion. Services
consume repository interfaces and should not depend on Drizzle implementations,
tables, or query builders.

## Module shape

Start with a flat feature directory when the feature is small:

```text
packages/api/src/features/achievements/
  achievements.router.ts
  achievements.service.ts
  achievements.tokens.ts
  achievements.constants.ts
  achievements.cache-keys.ts
  achievements.events.ts
  achievements.types.ts
  initialize-achievements.task.ts
  user-achievement.schema.ts
  user-achievement.repository.ts
  drizzle-user-achievement.repository.ts
  user-achievement.resolver.ts
  user-achievement.types.ts
```

When a feature contains distinct subdomains, create nested modules rather than
allowing the feature root to become a dumping ground:

```text
packages/api/src/features/storyteller/
  storyteller.router.ts
  storyteller.service.ts
  storyteller.tokens.ts
  agent-executions/
    agent-execution.service.ts
    agent-execution.repository.ts
    drizzle-agent-execution.repository.ts
    agent-execution.resolver.ts
  agent-notes/
    agent-note.service.ts
    agent-note.repository.ts
    drizzle-agent-note.repository.ts
    agent-note.resolver.ts
```

Choose a submodule when a concept has its own persistence, response shape,
workflow, or more than a few closely related files. Keep shared orchestration
at the feature root and move entity-specific code into the submodule.

Do not create `index.ts` barrels. Import directly from the owning file. Do not
re-export a value, type, or class through another module. Use kebab-case file
names and `i`-prefixed interfaces. Declare every closed-set value with `em([...])`
from `enumwaii`; `eslint-plugin-enumwaii` enforces it.

## Shared building blocks

- **Cache**: inject `CacheService` (`#~/features/cache/cache.service`) and use
  `cached(key, ttlSeconds, fetcher)`, `get`, `set`, `delete`, or
  `invalidatePattern`. It sits on `KEY_VALUE_STORE_TOKEN`: with no key-value
  store module installed nothing is cached, and the valkey module binds the real
  store. TTLs come from `CACHE_TTL` (`cache.constants.ts`); the feature's own keys
  live in `<feature>.cache-keys.ts`. Never build a custom in-memory cache.
- **Events**: inject `EventBus` (`#~/features/events/event-bus`) and pass it
  payload tokens (`@startername/common/helpers/payload-token.helper`, see the
  `payload-tokens` skill). `emit` calls handlers synchronously; `emitAsync` awaits
  every handler and never rejects, so a failing handler cannot fail the emitting
  workflow. Declare event tokens with the feature that emits them
  (`AUTH_EVENTS` in `auth.events.ts`, `ACHIEVEMENT_EVENTS` in
  `achievements.events.ts`) and register handlers from a startup task, not from a
  service constructor.
- **Request context**: in handlers use `context.resolve(Service)` (a container
  created for the request) and, when better-auth is installed, `context.session`.
  Loggers read the request id and user id from `RequestContextStorage`.

## Wiring a feature

Feature files are written by hand; the maps that connect them are not.
Modules declare what they contribute to the API in their manifest
(`packages/create-tsukuri/src/modules/*.module.ts`; `example-domain.module.ts` is
the worked example for a feature and `better-auth.module.ts` shows context
providers and HTTP handlers), and the generator rebuilds these files from
`starter.json` plus the manifests:

| Contribution kind | Generated file |
| --- | --- |
| `CONTRACT` | `packages/server-contract/src/generated/contracts.ts` |
| `ROUTER` | `packages/api/src/generated/routers.ts` |
| `DI_REGISTRATION` | `packages/api/src/generated/di-registrations.ts` |
| `STARTUP_TASK` | `packages/api/src/generated/startup-tasks.ts` |
| `DATABASE_SCHEMA` | `packages/api/src/generated/database-schema.ts` |
| `HTTP_HANDLER` | `packages/api/src/generated/http-handlers.ts` |
| `CONTEXT_PROVIDER` | `packages/api/src/generated/api-context.ts` |
| `ERROR_CODE` | `packages/common/src/generated/error-codes.ts` |
| `ENV_SHAPE` | `packages/api/src/generated/env.schema.ts` (spreads the module's `<module>.env.ts` zod shape) |
| `ENV_VARIABLE` | the root `.env.example` (one entry per key of that shape) |

Never edit anything under `src/generated/`. In this repository, change the
module manifest and run `pnpm run sync`. In a generated project, a new feature
is its own files plus matching entries in these connection points, added the way
the generated files show (follow each generated file's header and the project's
`AGENTS.md`). The generated files are rebuilt from `starter.json` and the module
manifests whenever modules are added or removed with `create-tsukuri add` or
`remove`, so re-check them afterwards; entries that must survive regeneration
belong in a module manifest.

## Implementation workflow

1. Identify the feature and whether it belongs in an existing nested module.
2. Define or reuse the contract in `packages/server-contract` and its schemas
   first.
3. Define feature types, the repository interface, and its token in the owning
   module.
4. Add the Drizzle table in `<name>.schema.ts` and generate the migration with
   `pnpm run db:generate`.
5. Add or update the resolver for the exact response shape.
6. Implement the Drizzle repository behind the interface, using injected
   `DatabaseService` and resolver dependencies.
7. Implement the service with injected interfaces and other services. Keep
   authorization decisions explicit and use the server error-handling skill for
   access failures.
8. Add `<feature>.router.ts` as the router adapter.
9. Register the contract, router, schema, repository binding, startup tasks, and
   error codes through the connection points above.
10. Add meaningful service or router integration tests; do not test schemas,
    migrations, generated code, constants, or third-party behavior.
11. Run `pnpm run verify` before handoff.

Load the `dependency-injection-setup`, `drizzle-orm`, `server-error-handling`,
`server-router-implementation`, and `server-testing` skills when their
respective concerns are involved. This skill defines module boundaries; those
skills remain authoritative for their implementation details.
