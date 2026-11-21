---
name: drizzle-orm
description: Design Postgres or SQLite schemas, migrations, and typed repository queries with Drizzle ORM.
---

# Drizzle ORM

A project runs on one database: the `postgres` module (`pg`; a shared pool on Node, or one pool per request through Hyperdrive on a Cloudflare Worker), the `sqlite` module (built-in `node:sqlite`, Node only) or the `d1` module (Cloudflare D1 on a Worker, with the SQLite tables). All of them put the same files at the same paths, so repositories, services and tests are written once and compile against whichever is installed:

- `#~/features/database/database.service` (`DatabaseService`, `getDb()`), `database-error.guard` (`DatabaseErrorGuard.isUniqueViolation`), `database-migrator`, `schema.helpers` and `database.constants` (`DATABASE_DIALECT`, `MIGRATIONS_FOLDER`).
- `<feature>.schema.ts` table files. A module that owns tables ships them once per database, and a glue module per database (for example `better-auth-postgres` and `better-auth-sqlite`) installs the set that matches the project.
- Keep repository code dialect-neutral: the query builder (`select`, `insert ... returning`, `onConflictDoUpdate`/`onConflictDoNothing`, `update`, `delete`) reads the same in both. Avoid raw SQL and `db.transaction` with async callbacks (SQLite transactions are synchronous); put dialect-specific behaviour behind a class in `features/database`.

Keep each feature's tables in `packages/api/src/features/<feature>/<name>.schema.ts`, next to the feature that owns them. They are the source of truth for tables, indexes, foreign keys, and inferred row types. There is no `src/db/schema` folder.

- Keep database access behind feature repositories rather than importing tables throughout handlers. A repository is an `i`-prefixed interface (`<name>.repository.ts`) with a `drizzle-<name>.repository.ts` implementation bound to a token (see the `dependency-injection-setup` skill).
- `packages/api/drizzle.config.ts` globs `./src/features/**/*.schema.ts` and writes migrations to `MIGRATIONS_FOLDER` (`packages/api/src/db/migrations`). A new schema file is picked up automatically by migration generation.
- Register the schema file with the `DATABASE_SCHEMA` connection point of the module that owns the feature (see `example-domain.module.ts`). That writes it into `src/generated/database-schema.ts` (`generatedDatabaseSchema`), which `DatabaseService` passes to Drizzle and tests use to build their database. Never edit `src/generated/`.
- Use `idColumn` / `idPrimaryKey` from `#~/features/database/schema.helpers` for ids (uuid on Postgres, random UUID text on SQLite); SQLite also has `timestampColumn` and `booleanColumn`. Prefer `$defaultFn(() => new Date())` for SQLite timestamps, `defaultNow()` on Postgres.
- Generate migrations with `pnpm run db:generate` and apply them with `pnpm run db:migrate` (root aliases for the `@startername/api` scripts; Postgres also has `db:push` and `db:studio`). Commit both the SQL file and the migration metadata.
- The runtime connection reads `env.POSTGRES_URL` or `env.SQLITE_PATH` (`#~/constants/env`), loaded from the root `.env`. The default SQLite file is `data/startername.db` at the project root.
- Integration tests run on an in-memory database built from `generatedDatabaseSchema` (PGlite with drizzle-kit `pushSchema`; `:memory:` SQLite or a local D1 from wrangler, both with drizzle-kit `generateSQLiteMigration`), and every table is emptied after each test (`test/helpers/postgres-memory.ts`, `test/helpers/sqlite-memory.ts` or the D1 setup, plus `test/helpers/setup/database.setup.ts`). A schema change needs no test-side migration.
- Keep Better Auth's `users`, `sessions`, `accounts`, and `verifications` schemas in `features/auth/auth.schema.ts` in sync with `@better-auth/drizzle-adapter`; the adapter's `provider` is `DATABASE_DIALECT`.

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

Don't hand-write a `toResponse(row)` function that copies every field one by one — most of that copying is one of three mechanical operations: pass a field through untouched, turn a nullable column into an optional field (`value ?? undefined`), or drop a column that isn't exposed in the API. Use `createRowResolver` from `#~/lib/row-resolver` to express those declaratively, and group a feature's resolvers in a `<name>.resolver.ts` file as a `@singleton()` class (mirrors a GraphQL resolver map, and keeps every response-shaping function for a feature in one place). Resolvers are dependency-injected like repositories — not static classes — so they compose with tsyringe the same way `DatabaseService` does:

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
    private readonly databaseService: DatabaseService,
    private readonly someResolver: SomeResolver,
  ) {}

  public async findById(someId: string) {
    const [row] = await this.databaseService.getDb().select().from(someTable).where(eq(someTable.id, someId)).limit(1);
    return row ? this.someResolver.toSomeResponse(row) : null;
  }
}
```

See `packages/api/src/features/auth/auth-user.resolver.ts`, `packages/api/src/features/achievements/user-achievement.resolver.ts`, and `packages/api/src/features/user/user-profile.resolver.ts` (with its `drizzle-user-profile.repository.ts`) for real examples.
