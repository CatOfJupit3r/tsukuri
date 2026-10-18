# Test Utilities

Reusable helpers, fixtures, and utilities that make writing tests easier and more consistent. They live in `packages/api/test/`: shared helpers in `test/helpers/`, domain fixtures in `test/integration/fixtures/`.

## Primary Mission: Build a Fixture Library

The most important role of test utilities is **building a library of specialized fixtures that express test intent clearly**. Instead of repeating setup code or calling endpoints directly in tests, create domain-specific fixtures.

### Fixture Philosophy

```typescript
// ❌ BAD: Test has to know how to set up complex scenarios
it('should select badge', async () => {
  const { ctx, user } = await createUser();

  // How do we unlock achievements? This couples the test to implementation
  await getUserAchievementRepository().ensureUnlocked(user.id, USER_ACHIEVEMENTS.BETA_TESTER);

  const result = await call(appRouter.user.updateUserBadge, { badgeId: BADGE_IDS.BETA_TESTER }, ctx());
  expect(result.selectedBadge).toBe(BADGE_IDS.BETA_TESTER);
});

// ✅ GOOD: Fixture expresses intent, test is clean
it('should select badge', async () => {
  const { ctx } = await createUserWithAchievement(USER_ACHIEVEMENTS.BETA_TESTER);

  const result = await call(appRouter.user.updateUserBadge, { badgeId: BADGE_IDS.BETA_TESTER }, ctx());
  expect(result.selectedBadge).toBe(BADGE_IDS.BETA_TESTER);
});
```

**Key Benefits of a Rich Fixture Library:**
- Tests express intent immediately (what scenario?)
- Setup code is centralized and maintainable
- Changes to how scenarios are created only affect fixtures, not tests
- New team members understand test purpose quickly
- Reduces cognitive load—tests stay simple and readable

## Core Test Helpers

### createUser()

Creates an authenticated user with a session. This is the primary test utility for integration tests. It signs up through Better Auth (resolved from the container) and reads the session back.

**Location**: `test/helpers/auth-users.ts` (installed with the better-auth module)

```typescript
import { createUser } from '../helpers/auth-users';

// Create user with random data
const { ctx, user, session, cookie } = await createUser();

// Create user with specific data
const { ctx, user } = await createUser({
  email: 'test@example.com',
  name: 'Test User',
  password: 'password123',
});
```

**Returns**:
- `ctx()` - Function that returns the oRPC call options (`{ context: { session, resolve } }`)
- `user` - Better Auth user object with `id`, `email`, `name`
- `session` - Session object
- `cookie` - Authentication cookie string

### appRouter

The router the API serves, built from the installed modules' routers:

```typescript
import { appRouter } from '#~/app-router';

const result = await call(appRouter.user.getUserProfile, null, ctx());
```

There is no app instance to load or reset: `test/helpers/setup.ts` calls `startApi()` once for the whole integration run.

### Repository fixtures

**Location**: `test/integration/fixtures/repository.fixtures.ts`

Resolve a repository through its token from the container, for arranging or verifying state that no endpoint exposes:

```typescript
export function getUserProfileRepository() {
  return container.resolve<iUserProfileRepository>(USER_PROFILE_REPOSITORY_TOKEN);
}
```

### expectORPCError()

**Location**: `test/helpers/orpc-errors.ts`

Asserts that a call rejects with a structured error code (and its message from `errorMessages`):

```typescript
await expectORPCError(call(appRouter.user.updateUserBadge, input, ctx()), {
  code: errorCodes.USER_BADGE_NOT_ALLOWED,
});
```

### mockContainerResolve()

**Location**: `test/helpers/unit-mocks.ts`

For unit tests of code that resolves from the global container. Each token resolves to its fake, and an unmapped token fails the test:

```typescript
mockContainerResolve([
  [AuthService, fakeAuthService],
  [RequestContextStorage, fakeRequestContext],
]);
```

## Custom Matchers

### toBeNil()

Checks if value is `null` or `undefined`.

**Location**: `test/helpers/matchers.ts`

```typescript
// Passes
expect(null).toBeNil();
expect(undefined).toBeNil();

// Fails
expect('value').toBeNil();
expect(0).toBeNil();

// With .not
expect('value').not.toBeNil();
expect(0).not.toBeNil();
```

**Type Safety**: Automatically augments Vitest types so TypeScript knows about the matcher.

## Creating Custom Test Utilities

### Pattern 1: Specialized User Fixtures (Most Important)

Create domain-specific fixtures that represent meaningful test scenarios. These become the building blocks of your test suite.

Fixtures should call endpoints via `call()` to ensure full API testing, and use the repository fixtures only where the API has no endpoint for the setup.

```typescript
// test/integration/fixtures/user-profile.fixtures.ts

/**
 * User with a specific achievement unlocked
 */
export async function createUserWithAchievement(achievementId: UserAchievementId) {
  const user = await createUser();
  await getUserAchievementRepository().ensureUnlocked(user.user.id, achievementId);
  return user;
}

/**
 * User with specific bio saved
 */
export async function createUserWithBio(bio: string) {
  const user = await createUser();
  const profile = await call(appRouter.user.updateUserProfile, { bio }, user.ctx());
  return { ...user, profile };
}

/**
 * User with a badge selected and the achievement it requires unlocked
 */
export async function createUserWithBadge(badgeId: BadgeId) {
  // Compose existing fixtures
  const requiredAchievement = BADGES_META.find((badge) => badge.id === badgeId)?.requiresAchievement;
  const user = requiredAchievement ? await createUserWithAchievement(requiredAchievement) : await createUser();

  // Set the badge via endpoint
  const profile = await call(appRouter.user.updateUserBadge, { badgeId }, user.ctx());

  return { ...user, profile };
}
```

**Key Pattern**: Fixtures call endpoints via `call()` to ensure they test the full API layer, not just the business logic.

### Pattern 2: Building Complex Scenarios

Compose simple fixtures into more complex ones. The `challenges` and `teams` procedures below are illustrative; use your own features' procedures:

```typescript
/**
 * User with a completed challenge
 */
export async function createUserWithCompletedChallenge() {
  const user = await createUser();
  // Create and complete a challenge via endpoint
  const challenge = await call(appRouter.challenges.create, { title: 'Test Challenge' }, user.ctx());
  await call(appRouter.challenges.submit, { challengeId: challenge.id, answer: '...' }, user.ctx());

  return { user, challenge };
}

/**
 * Team with multiple members at different permission levels
 */
export async function createTeamWithMembers() {
  const owner = await createUser();
  const member1 = await createUser();
  const member2 = await createUser();

  // Create team and add members via endpoints
  const team = await call(appRouter.teams.create, { name: 'Test Team' }, owner.ctx());
  await call(appRouter.teams.addMember, { teamId: team.id, userId: member1.user.id, role: 'MEMBER' }, owner.ctx());
  await call(appRouter.teams.addMember, { teamId: team.id, userId: member2.user.id, role: 'EDITOR' }, owner.ctx());

  return { owner, team, member1, member2 };
}
```

### Pattern 3: Data Factory Functions

Generate random test data:

```typescript
export function createChallengeData(overrides = {}) {
  return {
    title: 'Test Challenge',
    description: 'Test Description',
    difficulty: 'MEDIUM',
    points: 100,
    ...overrides,
  };
}
```

Custom matchers for domain assertions go in `test/helpers/matchers.ts`:

```typescript
import { expect } from 'vitest';

expect.extend({
  toHaveValidTimestamps(received) {
    const hasCreatedAt = received.createdAt instanceof Date;
    const hasUpdatedAt = received.updatedAt instanceof Date;

    if (hasCreatedAt && hasUpdatedAt) {
      return {
        message: () => `expected object not to have valid timestamps`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected object to have valid createdAt and updatedAt`,
        pass: false,
      };
    }
  },
});

// Type augmentation
declare module 'vitest' {
  interface Assertion<T = any> {
    toHaveValidTimestamps(): T;
  }
}

// Usage
expect(profile).toHaveValidTimestamps();
```

### Pattern: Request Helpers

To test transport behavior, send a `Request` through `ApiRequestHandler` (the handler every backend adapter forwards to) rather than starting a server:

```typescript
import { container } from 'tsyringe';

import { ApiRequestHandler } from '#~/features/http/api-request-handler';

export async function sendRequest(path: string, init?: RequestInit) {
  return container.resolve(ApiRequestHandler).handle(new Request(`http://localhost${path}`, init));
}

// Authenticated: pass the cookie from createUser()
const response = await sendRequest('/users/profile', { headers: { cookie } });
```

`handle` returns `null` for paths no route serves.

## Test Database Helpers

Direct database manipulation goes through repositories, not tables:

```typescript
// Arrange state no endpoint exposes
await getUserProfileRepository().deleteByUserId(userId);

// Unlock an achievement
await getUserAchievementRepository().ensureUnlocked(userId, USER_ACHIEVEMENTS.BETA_TESTER);
```

Every table is truncated after each test (`test/helpers/setup/database.setup.ts`), so fixtures do not clean up after themselves.

## Setup Hooks Utilities

### beforeEach / afterEach Helpers

```typescript
import { beforeEach } from 'vitest';

describe('Feature with Shared Setup', () => {
  let testUser: Awaited<ReturnType<typeof createUser>>;

  beforeEach(async () => {
    testUser = await createUser();
    // Additional setup
  });

  it('uses shared testUser', async () => {
    const result = await call(
      appRouter.user.getUserProfile,
      null,
      testUser.ctx()
    );
    expect(result).toBeDefined();
  });
});
```

## Replacing a Binding for the Whole Run

The container is shared by all integration tests and is not reset between them. To swap an implementation for the whole run, register the replacement in a module setup file, which runs before `startApi()`:

```typescript
// test/helpers/setup/auth.setup.ts
import { container } from 'tsyringe';

import { AuthPasswordHasher } from '#~/features/auth/auth-password-hasher';

import { PlaintextAuthPasswordHasher } from '../plaintext-auth-password-hasher';

container.register(AuthPasswordHasher, { useClass: PlaintextAuthPasswordHasher });
```

Files matching `test/helpers/setup/*.setup.ts` are picked up automatically by `vitest.config.ts`.

## Environment Utilities

Test environment variables come from the root `.env.example` (`loadExampleEnv` from `@startername/vitest-config/example-env`, with `NODE_ENV=test` and `LOG_LEVEL=error`). The validated values are available through `env` from `#~/constants/env`; do not read `process.env` in tests or fixtures.

## Async Test Utilities

### waitFor Pattern

For tests that need to wait for async operations:

```typescript
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout = 5000
) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error('Condition not met within timeout');
}

// Usage
await waitFor(async () => {
  const profile = await getUserProfileRepository().findByUserId(userId);
  return profile?.selectedBadge === BADGE_IDS.DEFAULT;
});
```

Prefer awaiting `EventBus.emitAsync` effects or the call that triggers them; use `waitFor` only for work that is genuinely detached.

## Best Practices

1. **Build fixtures before tests** - Create domain-specific fixtures first, then write tests using them
2. **Call endpoints in fixtures** - Fixtures use `call()` to test the full API layer
3. **Keep utilities DRY** - Extract repeated setup into utilities
4. **Make utilities composable** - Small, focused functions that combine well
5. **Document utility functions** - Add JSDoc comments for complex helpers
6. **Use TypeScript** - Ensure type safety in test utilities
7. **Avoid over-abstraction** - Balance reusability with clarity
8. **Co-locate utilities** - Put fixtures in `test/integration/fixtures/`, shared helpers in `test/helpers/`
9. **One fixtures file per feature** - Make all fixtures of a feature discoverable in one place

### Fixture Naming Convention

```typescript
// ✅ GOOD: Clear purpose from name
export async function createUserWithAchievement(id: UserAchievementId) { }
export async function createUserWithBadge(id: BadgeId) { }
export async function createTeamWithMembers() { }
export async function createCompletedChallenge() { }

// ❌ AVOID: Vague names
export async function setupTest1() { }
export async function getUser() { }
export async function prepareData() { }
```

## Common Utilities Checklist

When building your fixture library, consider creating:
- ✅ Basic user creation (`createUser`)
- ✅ Specialized user types (`createUserWithBio`, `createUserWithAchievement`)
- ✅ Complex scenarios (`createTeamWithMembers`, `createCompletedChallenge`)
- ✅ Data factories (`createChallengeData`)
- ✅ Custom matchers (`toHaveValidTimestamps`, `toBeValidId`)
- ✅ Repository accessors (`getUserProfileRepository`)
- ✅ Async utilities (`waitFor`)

## Anti-Patterns to Avoid

❌ Don't call endpoints in tests (encapsulate in fixtures)
❌ Don't repeat setup code across tests (extract to fixture)
❌ Don't have fixtures that are too generic (be specific)
❌ Don't forget to document fixture purpose
❌ Don't mix setup concerns in test files (keep in fixtures)

✅ Do call endpoints in fixtures to test the full API
✅ Do create specialized fixtures for each scenario
✅ Do reuse fixtures across multiple tests
✅ Do update fixtures in one place when APIs change
✅ Do name fixtures descriptively
✅ Do compose fixtures for complex scenarios
