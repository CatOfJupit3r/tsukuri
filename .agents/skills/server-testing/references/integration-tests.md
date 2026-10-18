# Integration Tests

Integration tests verify complete feature flows by testing routers, services, and database operations together. This is the **preferred** testing approach for the server.

They live in `packages/api/test/integration/` and run against the real DI container (started once by `test/helpers/setup.ts`) and an in-memory PGlite database.

## Why Integration Tests?

Integration tests provide the most value because they:
- Test the full stack as users experience it
- Catch integration issues between layers
- Provide confidence that features work end-to-end
- Require less mocking and maintenance

## Key Philosophy: Build Fixtures, Don't Call Endpoints (In Tests)

The most important principle: **Always create specialized fixtures for test setup instead of calling endpoints directly in tests.**

Fixtures **should** call endpoints via `call()` where the API has one (and use the repository fixtures where it has none), but tests **should not**. This separation keeps tests clean and focused.

```typescript
// ❌ BAD: Test has to know how to set up scenarios
it('should update user badge', async () => {
  const { ctx, user } = await createUser();
  // Couples the test to how achievements are unlocked
  await getUserAchievementRepository().ensureUnlocked(user.id, USER_ACHIEVEMENTS.BETA_TESTER);

  const result = await call(appRouter.user.updateUserBadge, { badgeId: BADGE_IDS.BETA_TESTER }, ctx());
  expect(result.selectedBadge).toBe(BADGE_IDS.BETA_TESTER);
});

// ✅ GOOD: Fixture encapsulates setup, test focuses on behavior
it('should update user badge', async () => {
  // Clear intent, fixture handles all the complexity
  const { ctx } = await createUserWithAchievement(USER_ACHIEVEMENTS.BETA_TESTER);

  const result = await call(appRouter.user.updateUserBadge, { badgeId: BADGE_IDS.BETA_TESTER }, ctx());
  expect(result.selectedBadge).toBe(BADGE_IDS.BETA_TESTER);
});
```

**Benefits of the fixture approach:**
- ✅ Tests express intent clearly (what scenario are we testing?)
- ✅ Fixtures call endpoints, ensuring full API testing
- ✅ Changes to API contracts only affect the fixture, not all tests
- ✅ Easier to read and understand test purpose
- ✅ Fixtures become reusable across many tests
- ✅ Setup code is centralized and maintainable

## Basic Structure

```typescript
import { call } from '@orpc/server';
import { describe, it, expect } from 'vitest';

import { appRouter } from '#~/app-router';

import { createUser } from '../helpers/auth-users';

describe('Feature Name', () => {
  it('should handle typical use case', async () => {
    // Setup
    const { ctx, user } = await createUser();

    // Execute
    const result = await call(
      appRouter.namespace.procedure,
      { input: 'data' },
      ctx()
    );

    // Assert
    expect(result).not.toBeNil();
    expect(result.field).toBe('expected');
  });
});
```

`appRouter` is the router the API serves (`#~/app-router`); `namespace` is the key the feature's router is registered under. `createUser()` comes from `test/helpers/auth-users.ts`, and its `ctx()` returns the call options with a session and `resolve`.

## Creating and Using Specialized Fixtures

The foundation of maintainable tests is building a library of specialized fixtures that express intent clearly. Each fixture should represent a specific test scenario. Put them in `test/integration/fixtures/<feature>.fixtures.ts`; see `examples/test-utilities.ts`.

### Fixture Types to Create

**1. Domain-Specific User Fixtures**

```typescript
// test/integration/fixtures/user-profile.fixtures.ts

export async function createUserWithAchievement(achievementId: UserAchievementId) {
  const user = await createUser();
  // No endpoint grants achievements, so the fixture goes through the repository
  await getUserAchievementRepository().ensureUnlocked(user.user.id, achievementId);
  return user;
}

export async function createUserWithBadge(badgeId: BadgeId) {
  const requiredAchievement = BADGES_META.find((badge) => badge.id === badgeId)?.requiresAchievement;
  const user = requiredAchievement ? await createUserWithAchievement(requiredAchievement) : await createUser();
  // Select the badge via endpoint
  await call(appRouter.user.updateUserBadge, { badgeId }, user.ctx());
  return user;
}

export async function createUserWithBio(bio: string) {
  const user = await createUser();
  const profile = await call(appRouter.user.updateUserProfile, { bio }, user.ctx());
  return { ...user, profile };
}
```

**2. Resource Creation Fixtures**

The `challenges` and `teams` endpoints in the remaining examples are illustrative; use the procedures of your own features.

```typescript
export async function createChallengeWithParticipants(count: number) {
  const creator = await createUser();
  const challenge = await call(appRouter.challenges.create, { title: '...' }, creator.ctx());

  const participants = await Promise.all(
    Array.from({ length: count }).map(() => createUser())
  );

  return { creator, challenge, participants };
}
```

**3. Specific Scenario Fixtures**

```typescript
export async function setupCompletedUserChallenge() {
  const user = await createUser();
  const { challenge } = await createChallengeWithParticipants(1);

  // Complete the challenge via endpoint
  await call(appRouter.challenges.submit, { challengeId: challenge.id, answer: '...' }, user.ctx());

  return { user, challenge };
}
```

### Using Fixtures in Tests

```typescript
describe('Badge System', () => {
  it('should have badge selected when user has achievement', async () => {
    // Use specialized fixture - immediately clear what this test needs
    const { ctx } = await createUserWithBadge(BADGE_IDS.BETA_TESTER);

    // Test verifies the state, not the setup
    const profile = await call(appRouter.user.getUserProfile, null, ctx());
    expect(profile.selectedBadge).toBe(BADGE_IDS.BETA_TESTER);
  });

  it('should reject badge without achievement', async () => {
    // Use basic fixture - this user has no achievements
    const { ctx } = await createUser();

    // Test the actual behavior
    await expectORPCError(
      call(appRouter.user.updateUserBadge, { badgeId: BADGE_IDS.BETA_TESTER }, ctx()),
      { code: errorCodes.USER_BADGE_NOT_ALLOWED },
    );
  });
});
```

**Pattern Recognition**: By using specialized fixtures, you can immediately understand what each test scenario requires without reading the setup code. Fixtures do the work; tests verify the behavior.

## Testing Patterns

### 1. Testing with Fixtures

Most tests should use specialized fixtures. The test verifies behavior, the fixture creates the scenario:

```typescript
// ✅ GOOD: Fixture creates scenario, test verifies behavior
it('should return the saved bio', async () => {
  const { ctx } = await createUserWithBio('My bio');

  // Test only verifies the outcome
  const profile = await call(appRouter.user.getUserProfile, null, ctx());
  expect(profile.bio).toBe('My bio');
});
```

### 2. Authorization Checks

Test that unauthorized access is rejected, asserting the structured error code with `expectORPCError` (`test/helpers/orpc-errors.ts`):

```typescript
it('should reject badge selection without achievement', async () => {
  const { ctx } = await createUser(); // Basic user, no achievements

  // Test the actual rejection behavior
  await expectORPCError(
    call(appRouter.user.updateUserBadge, { badgeId: BADGE_IDS.BETA_TESTER }, ctx()),
    { code: errorCodes.USER_BADGE_NOT_ALLOWED },
  );
});
```

### 3. Multiple Users / Interactions

Create specialized fixtures for multi-user scenarios:

```typescript
it('should handle team with multiple members', async () => {
  // Use fixture that creates team with members
  const { owner, member1, member2 } = await createTeamWithMembers();

  // Test team interaction behavior
  const teamData = await call(appRouter.teams.getTeam, { teamId: owner.id }, owner.ctx());
  expect(teamData.members).toHaveLength(2);
});

it('should prevent duplicate emails', async () => {
  const user1 = await createUser();

  await expect(
    createUser({
      email: user1.user.email,
      name: 'Different Name',
      password: 'password123',
    })
  ).rejects.toThrow();
});
```

### 4. Verifying Behavior with Fixtures

Use fixtures to set up complex scenarios, then test behavior:

```typescript
it('should show completed challenges', async () => {
  // Fixture handles all setup
  const { user, challenge } = await createUserWithCompletedChallenge();

  // Test verifies the behavior
  const challenges = await call(appRouter.challenges.getUserChallenges, { status: 'COMPLETED' }, user.ctx());
  expect(challenges).toContainEqual(expect.objectContaining({ id: challenge.id }));
});
```

### 5. Validation Testing

The contract validates input before the handler runs, so assert both sides of a boundary:

```typescript
it('should allow bio with exactly 500 chars', async () => {
  const { profile } = await createUserWithBio('a'.repeat(500));

  expect(profile.bio).toHaveLength(500);
});

it('should reject bio exceeding max length', async () => {
  await expect(createUserWithBio('a'.repeat(501))).rejects.toThrow();
});
```

### 6. Missing Resources and Persistence

Use the repository fixtures to arrange or verify database state that no endpoint exposes:

```typescript
it('should auto-create profile on first update if missing', async () => {
  const { ctx, user } = await createUser();
  await getUserProfileRepository().deleteByUserId(user.id);

  const updated = await call(appRouter.user.updateUserProfile, { bio: 'New bio' }, ctx());

  expect(updated.userId).toBe(user.id);
  expect((await getUserProfileRepository().findByUserId(user.id))?.bio).toBe('New bio');
});
```

`getUserProfileRepository()` and `getUserAchievementRepository()` live in `test/integration/fixtures/repository.fixtures.ts` and resolve the repository through its token from the container.

## Using oRPC's `call()` Helper

Always use `call()` from `@orpc/server` to invoke routers:

```typescript
import { call } from '@orpc/server';

const result = await call(
  appRouter.namespace.procedure,  // The router procedure
  { input: 'value' },              // Input data (null for procedures without input)
  ctx()                            // Context (session, resolve)
);
```

This provides:
- Full type safety
- Automatic input validation
- Context injection
- The same middleware chain the API serves (including the unexpected-error boundary)

To test transport behavior (headers, cookies, module HTTP handlers, unmatched routes), send a `Request` through `ApiRequestHandler` instead, as `test/integration/health.test.ts` does.

## Test Organization

### File Naming

```
test/integration/<feature-name>.test.ts
```

Examples:
- `auth.test.ts`
- `user-profile.test.ts`
- `achievements.test.ts`
- `badges.test.ts`

### Describe Blocks

Organize by feature and then by procedure:

```typescript
describe('User Profile API', () => {
  describe('getUserProfile', () => {
    it('should auto-create user profile', async () => {});
    it('should fail if profile does not exist', async () => {});
  });

  describe('updateUserProfile', () => {
    it('should update user profile', async () => {});
    it('should validate bio max length', async () => {});
  });
});
```

## Best Practices

1. **Create specialized fixtures first** - Build fixtures for common scenarios before writing tests
2. **Use fixtures instead of calling endpoints** - Express intent clearly, avoid tight coupling to API
3. **Test happy path first** - Verify the main use case works
4. **Then test edge cases** - Validation, boundaries, errors
5. **Use meaningful test names** - Describe what should happen
6. **Avoid over-mocking** - Test real integrations when possible
7. **Keep tests independent** - Don't rely on test execution order
8. **Use type-safe helpers** - `createUser()`, `call()`, custom fixtures, etc.
9. **Verify database state** - Check persistence when relevant
10. **Test authorization** - Always verify access control

## Common Mistakes to Avoid

❌ Don't call multiple endpoints to set up test state (use fixtures instead)
❌ Don't mock the database in integration tests
❌ Don't test implementation details
❌ Don't write flaky tests that depend on timing
❌ Don't skip error case testing
❌ Don't use hardcoded IDs—use `createUser()` or custom fixtures instead
❌ Don't repeat setup code across tests—extract into a reusable fixture

✅ Do create specialized fixtures for each test scenario
✅ Do use fixtures to express intent (what is this test scenario?)
✅ Do test the full feature flow
✅ Do verify both success and error cases
✅ Do clean up between tests (handled automatically)
✅ Do test with realistic data
✅ Do reuse fixtures across multiple tests
✅ Do update fixtures in one place when APIs change
