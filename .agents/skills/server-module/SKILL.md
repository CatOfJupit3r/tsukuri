---
name: server-module
description: >
  Organize and implement server features as focused, nested modules with clear
  service, repository, resolver, schema, and router boundaries. Use when adding
  or refactoring Hono/oRPC server functionality under apps/server/src.
---

# Server modules

Use a feature-first module layout. Keep domain code under
`apps/server/src/features/<feature>/`; do not place feature services,
repositories, resolvers, or business types directly in `src/`.

## Boundaries

- `*.service.ts` owns business workflows, policies, orchestration, and
  transactions that span repositories or external services. Services do not
  contain HTTP/oRPC concerns.
- `*.repository.ts` declares the persistence boundary as an `i`-prefixed
  interface. `drizzle-*.repository.ts` implements it with Drizzle and is the
  only feature layer that should know table-query details.
- `*.resolver.ts` owns conversion from persistence rows into the feature's
  singular response shapes. Make resolvers `@singleton()` classes and inject
  them into repositories. Use `createRowResolver` rather than hand-writing
  field-by-field response mappers; follow the `drizzle-orm` skill for details.
- `*.types.ts` contains feature input and response types. Derive repository
  responses from Drizzle table inference with `Pick`, `Omit`, or intersections;
  do not duplicate database columns manually.
- `*.schema.ts` contains feature-local Zod schemas or record schemas. Shared
  transport schemas belong in `packages/shared` contracts.
- `*.constants.ts` contains feature-local non-sensitive constants. Shared
  server/client constants belong in `packages/shared/src/constants`.
- `routers/*.router.ts` is the transport adapter. It validates through the
  shared contract, performs authentication/authorization, calls a service, and
  maps errors through the server error-handling conventions. Keep business
  logic out of routers.

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
apps/server/src/features/achievements/
  achievements.service.ts
  achievements.constants.ts
  achievements.types.ts
  user-achievement.repository.ts
  drizzle-user-achievement.repository.ts
  user-achievement.resolver.ts
  user-achievement.types.ts
```

When a feature contains distinct subdomains, create nested modules rather than
allowing the feature root to become a dumping ground:

```text
apps/server/src/features/storyteller/
  storyteller.service.ts
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

## Implementation workflow

1. Identify the feature and whether it belongs in an existing nested module.
2. Define or reuse the shared contract and its schemas first.
3. Define feature types and the repository interface in the owning module.
4. Add or update the resolver for the exact response shape.
5. Implement the Drizzle repository behind the interface, using injected
   `PostgresService` and resolver dependencies.
6. Implement the service with injected interfaces and other services. Keep
   authorization decisions explicit and use the server error-handling skill for
   access failures.
7. Add the router adapter and register it using the existing router pattern.
8. Add meaningful service or router integration tests; do not test schemas,
   migrations, generated code, constants, or third-party behavior.
9. Run `pnpm run verify` before handoff.

Load the `dependency-injection-setup`, `drizzle-orm`, `server-error-handling`,
`server-router-implementation`, and `server-testing` skills when their
respective concerns are involved. This skill defines module boundaries; those
skills remain authoritative for their implementation details.
