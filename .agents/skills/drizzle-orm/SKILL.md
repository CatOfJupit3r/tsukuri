---
name: drizzle-orm
description: Design PostgreSQL schemas, migrations, and typed repository queries with Drizzle ORM.
---

# Drizzle ORM

Keep each feature's tables in `packages/api/src/features/<feature>/<name>.schema.ts`, next to the feature that owns them. They are the source of truth for PostgreSQL tables, indexes, foreign keys, and inferred row types. There is no `src/db/schema` folder.

- Keep database access behind feature repositories rather than importing tables throughout handlers. A repository is an `i`-prefixed interface (`<name>.repository.ts`) with a `drizzle-<name>.repository.ts` implementation bound to a token (see the `dependency-injection-setup` skill).
- `packages/api/drizzle.config.ts` globs `./src/features/**/*.schema.ts` and writes migrations to `packages/api/src/db/migrations`. A new schema file is picked up automatically by migration generation.
- Register the schema file with the `DATABASE_SCHEMA` connection point of the module that owns the feature (see `example-domain.module.ts`). That writes it into `src/generated/database-schema.ts` (`generatedDatabaseSchema`), which `PostgresService` passes to Drizzle and tests use to build their database. Never edit `src/generated/`.
- Use `idColumn` / `idPrimaryKey` from `#~/features/postgres/schema.helpers` for uuid columns.
- Generate migrations with `pnpm run db:generate` (root alias for the `@startername/api` script; `db:migrate`, `db:push` and `db:studio` work the same way) and commit both the SQL file and migration metadata.
- The runtime connection reads `env.POSTGRES_URL` (`#~/constants/env`), loaded from the root `.env`.
- Integration tests run on an in-memory PGlite database whose tables are pushed from `generatedDatabaseSchema` with drizzle-kit `pushSchema`, and every table is truncated after each test (`test/helpers/postgres-memory.ts`, `test/helpers/setup/postgres.setup.ts`). A schema change needs no test-side migration.
- Keep Better Auth's `users`, `sessions`, `accounts`, and `verifications` schemas in `features/auth/auth.schema.ts` in sync with `@better-auth/drizzle-adapter`.

## Deriving repository response types

Don't hand-write repository response interfaces field-by-field — derive them from `typeof table.$inferSelect` so schema changes propagate automatically. Only override the fields that actually differ (e.g. nullable columns exposed as optional):

```typescript
// packages/api/src/features/<feature>/<feature>.types.ts
import type { someTable } from '#~/features/<feature>/<name>.schema';

type SomeRow = typeof someTable.$inferSelect;

export type iSomeRecordResponse = Omit<SomeRow, 'nullableColumn'> & {
  nullableColumn?: string;
};
```

Do not add a `export type SomeRecordResponse = iSomeRecordResponse` alias — import and use `iSomeRecordResponse` directly.

## Resolvers: turning rows into responses without boilerplate

Don't hand-write a `toResponse(row)` function that copies every field one by one — most of that copying is one of three mechanical operations: pass a field through untouched, turn a nullable column into an optional field (`value ?? undefined`), or drop a column that isn't exposed in the API. Use `createRowResolver` from `#~/lib/row-resolver` to express those declaratively, and group a feature's resolvers in a `<name>.resolver.ts` file as a `@singleton()` class (mirrors a GraphQL resolver map, and keeps every response-shaping function for a feature in one place). Resolvers are dependency-injected like repositories — not static classes — so they compose with tsyringe the same way `PostgresService` does:

```typescript
// packages/api/src/features/<feature>/<name>.resolver.ts
import { singleton } from 'tsyringe';

import type { someTable } from '#~/features/<feature>/<name>.schema';
import { createRowResolver } from '#~/lib/row-resolver';

import type { iSomeRecordResponse } from './<feature>.types';

type SomeRow = typeof someTable.$inferSelect;

@singleton()
export class SomeResolver {
  public toSomeResponse = createRowResolver<SomeRow, iSomeRecordResponse>({
    optional: ['nullableColumn'], // null -> undefined
    omit: ['internalColumn'], // dropped entirely, not in iSomeRecordResponse
    overrides: (row) => ({ someId: row.someId as SomeNarrowedId }), // anything else
  });
}
```

For the opposite direction, `createOwnPropertyUpdateResolver` (same file) turns a partial input into a Drizzle update: only the listed `fields` the caller actually passed become columns, so `undefined` never overwrites a value, and `updatedAt` is set to now by default:

```typescript
public toSomeUpdate = createOwnPropertyUpdateResolver<iUpsertSomeInput, SomeInsert>({
  fields: ['bio', 'selectedBadge'],
});
```

Repositories take the resolver as a constructor dependency and call its methods:

```typescript
@singleton()
export class DrizzleSomeRepository implements iSomeRepository {
  constructor(
    private readonly postgresService: PostgresService,
    private readonly someResolver: SomeResolver,
  ) {}

  public async findById(someId: string) {
    const [row] = await this.postgresService.getDb().select().from(someTable).where(eq(someTable.id, someId)).limit(1);
    return row ? this.someResolver.toSomeResponse(row) : null;
  }
}
```

See `packages/api/src/features/auth/auth-user.resolver.ts`, `packages/api/src/features/achievements/user-achievement.resolver.ts`, and `packages/api/src/features/user/user-profile.resolver.ts` (with its `drizzle-user-profile.repository.ts`) for real examples.
