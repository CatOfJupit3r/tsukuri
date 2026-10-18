---
name: server-testing
description: Write and run tests for the server API (packages/api) using Vitest. Prefer integration tests for features and use unit tests only for utilities and helpers. Use when creating tests for routers, services, repositories, implementing test utilities, debugging test failures, or running tests. Includes guidance on the "accessed before declaration" error which indicates errors in the CODE being tested, not the test itself.
---

# Server Testing

Write comprehensive tests for the server API in `packages/api` (`@startername/api`) using Vitest with a focus on integration testing.

## Core Principles

1. **Prefer Integration Tests**: Test features end-to-end through routers and services
2. **Unit Tests for Utilities Only**: Reserve unit tests for pure functions and helpers
3. **Use Specialized Fixtures**: Always create and reuse domain-specific fixtures for test setup. Instead of calling endpoints directly (which couples tests to API contracts), build fixtures on top of `createUser()` for each scenario (a user with a bio, a user with an unlocked achievement, etc.). This makes tests more maintainable and intent-clear
4. **Clean Database Between Tests**: Automatic cleanup ensures test isolation
5. **Type-Safe Testing**: Use oRPC's `call()` for invoking routers with full type safety

## Quick Reference

| Topic | Use When |
|-------|----------|
| [Integration Tests](references/integration-tests.md) | Testing routers, services, and full feature flows |
| [Unit Tests](references/unit-tests.md) | Testing utilities, helpers, and pure functions |
| [Test Utilities](references/test-utilities.md) | Creating fixtures, helpers, and custom matchers |
| [Running Tests](references/running-tests.md) | Executing tests locally and debugging failures |
| [Common Issues](references/common-issues.md) | Troubleshooting "accessed before declaration" and other errors |

## Running Tests

```bash
# The handoff gate: check-types, lint and the whole suite
pnpm run verify --tests

# Scope it to the API package
pnpm run verify --tests --filter @startername/api

# Watch mode while writing tests
pnpm --filter=@startername/api run test:watch
```

Run commands from the repository root. See [references/running-tests.md](references/running-tests.md) for focused runs and debugging.

## Test Structure

```
packages/api/test/
├── integration/              # Integration tests (preferred)
│   ├── auth.test.ts
│   ├── user-profile.test.ts
│   ├── achievements.test.ts
│   └── fixtures/             # Domain fixtures (repository.fixtures.ts, ...)
├── unit/                     # Unit tests (utilities, adapters with faked lookups)
│   ├── matchers.test.ts
│   └── event-bus.test.ts
└── helpers/                  # Test setup and configuration
    ├── setup.ts              # Starts the API once, after every module setup file
    ├── setup/                # One *.setup.ts per module (postgres.setup.ts, auth.setup.ts)
    ├── postgres-memory.ts    # In-memory PGlite with the generated schema
    ├── auth-users.ts         # createUser() and its ctx()
    ├── orpc-errors.ts        # expectORPCError
    ├── unit-mocks.ts         # mockContainerResolve
    └── matchers.ts           # Custom matchers (toBeNil, etc.)
```

`packages/api/vitest.config.ts` defines two projects. `unit` runs `test/unit/**` with only `reflect-metadata` and the matchers loaded. `integration` runs `test/integration/**` after every `test/helpers/setup/*.setup.ts` file and `test/helpers/setup.ts`, which calls `startApi()`. Each installed module ships its own setup files, so which ones exist depends on the installed modules. The test environment is the root `.env.example` (via `loadExampleEnv` from `@startername/vitest-config/example-env`) with `NODE_ENV=test`.

## When to Write Which Type of Test

### Integration Tests (Preferred)

Write integration tests for:
- ✅ Router endpoints
- ✅ Service layer logic
- ✅ Database operations
- ✅ Authentication/authorization flows
- ✅ Cross-feature interactions

Integration tests provide the most value by testing the full stack as users experience it.

### Unit Tests (Sparingly)

Only write unit tests for:
- ✅ Pure utility functions
- ✅ Data transformers
- ✅ Custom matchers
- ✅ Helper functions

Avoid unit testing services or routers—use integration tests instead. Code that resolves from the global container (for example `provideAuthSession`) can be unit tested by faking the lookups: `mockContainerResolve([[AuthService, fakeAuthService]])` from `test/helpers/unit-mocks.ts` maps each token to its fake and fails the test on any unmapped token.

## Quick Start: Writing an Integration Test

```typescript
import { call } from '@orpc/server';
import { describe, it, expect } from 'vitest';

import { BADGE_IDS } from '@startername/common/constants/badges';
import { errorCodes } from '@startername/common/generated/error-codes';

import { appRouter } from '#~/app-router';

import { createUser } from '../helpers/auth-users';
import { expectORPCError } from '../helpers/orpc-errors';
import { createUserWithBio } from './fixtures/user-profile.fixtures';

describe('User Profile API', () => {
  it('should perform action successfully', async () => {
    // Setup: createUser signs up a real user and returns its call context
    const { ctx, user } = await createUser();

    // Execute: Call the router
    const profile = await call(appRouter.user.getUserProfile, null, ctx());

    // Assert: Verify the result
    expect(profile).not.toBeNil();
    expect(profile.userId).toBe(user.id);
  });

  it('should handle users with a prepared scenario', async () => {
    // Use specialized fixture for specific test scenario
    const { ctx } = await createUserWithBio('My bio');

    const profile = await call(appRouter.user.getUserProfile, null, ctx());

    expect(profile.bio).toBe('My bio');
  });

  it('should reject a badge the user has not unlocked', async () => {
    const { ctx } = await createUser();

    // Test error case
    await expectORPCError(call(appRouter.user.updateUserBadge, { badgeId: BADGE_IDS.BETA_TESTER }, ctx()), {
      code: errorCodes.USER_BADGE_NOT_ALLOWED,
    });
  });
});
```

`createUser()` (`test/helpers/auth-users.ts`) returns `{ cookie, session, user, ctx }`. `ctx()` builds the oRPC call options (`{ context: { session, resolve } }`) that `call()` needs, so procedures built on `protectedProcedure` see an authenticated session.

**Key Pattern**: Create specialized fixtures (`createUser`, `createUserWithBio`, etc.) instead of calling endpoints directly. This keeps tests:
- Focused on what's being tested
- Independent from API implementation details
- Easier to maintain when fixtures change

## Critical: "Accessed Before Declaration" Error

**This error indicates a problem in your CODE, not your tests.**

When you see:
```
ReferenceError: Cannot access 'VariableName' before initialization
```

The issue is typically:
1. **Circular dependency** in your source code
2. **Import order problem** in your modules
3. **Top-level await** used incorrectly

**Do NOT try to fix this in your test file.** Instead:
- Check the source file being tested for circular imports
- Look for modules importing each other
- Verify initialization order in `#~/di/register-services.ts`, the generated startup tasks, and the module test setup files

See [references/common-issues.md](references/common-issues.md) for detailed troubleshooting.

## Custom Matchers

The project includes custom Vitest matchers:

```typescript
// Check for null or undefined
expect(value).toBeNil();
expect(value).not.toBeNil();
```

Defined in `test/helpers/matchers.ts` and auto-loaded for all tests.

## oRPC Error Assertions

Use the shared `expectORPCError` helper from `test/helpers/orpc-errors.ts` when asserting rejected oRPC calls. It verifies the structured error code and message, and can optionally verify the transport-level message.

```typescript
import { errorCodes } from '@startername/common/generated/error-codes';

import { expectORPCError } from '../helpers/orpc-errors';

await expectORPCError(
  call(appRouter.user.updateUserBadge, input, ctx()),
  { code: errorCodes.USER_BADGE_NOT_ALLOWED },
);
```

## Test Database

Tests use PGlite (an in-memory PostgreSQL implementation) for isolation:
- The in-memory database is created once per integration run from the generated schema (`generatedDatabaseSchema`) with drizzle-kit `pushSchema` (`test/helpers/postgres-memory.ts`); committed migrations are not applied, and `PostgresService` picks the test database up
- Every table is truncated after each test (`test/helpers/setup/postgres.setup.ts`, `TRUNCATE ... RESTART IDENTITY CASCADE`)
- No need to manually clean up—handled by `afterEach` in setup

## Module Test Setup

Each module adds its own `test/helpers/setup/<name>.setup.ts`. They run before `startApi()` (see `test/helpers/setup.ts`), so they can initialize the database or replace a class implementation in the container. The better-auth module, for example, registers a plaintext password hasher so a sign-up costs milliseconds instead of a scrypt hash:

```typescript
container.register(AuthPasswordHasher, { useClass: PlaintextAuthPasswordHasher });
```

Add a setup file when a test needs a different binding for the whole run; do not re-register services inside individual tests.

## See Also

- **examples/integration-test.ts** - Complete integration test example
- **examples/unit-test.ts** - Unit test example for utilities
- **examples/test-utilities.ts** - Creating custom test helpers
