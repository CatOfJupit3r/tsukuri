// Example: Creating Test Utilities (domain fixtures built on createUser)
// Location: packages/api/test/integration/fixtures/user-profile.fixtures.ts
//
// createUser() already exists in packages/api/test/helpers/auth-users.ts (installed with the better-auth module).
// Domain fixtures compose it and live next to the integration tests that use them.

import { call } from '@orpc/server';
import { container } from 'tsyringe';

import type { UserAchievementId } from '@startername/common/constants/achievements';
import type { BadgeId } from '@startername/common/constants/badges';

import { appRouter } from '#~/app-router';
import { BADGES_META } from '#~/features/badges/badges.constants';
import { ApiRequestHandler } from '#~/features/http/api-request-handler';

import { createUser } from '../../helpers/auth-users';
import { getUserAchievementRepository } from './repository.fixtures';

// ============================================================================
// User Fixtures
// ============================================================================

/**
 * Creates a user and reads their auto-created profile through the API
 *
 * @example
 * ```typescript
 * const { ctx, user, profile } = await createUserWithProfile();
 * ```
 */
export async function createUserWithProfile() {
  const user = await createUser();
  const profile = await call(appRouter.user.getUserProfile, null, user.ctx());

  return { ...user, profile };
}

/**
 * Creates a user and updates their bio through the API
 *
 * NOTE: The fixture calls the endpoint so the full API layer is exercised
 */
export async function createUserWithBio(bio: string) {
  const user = await createUser();
  const profile = await call(appRouter.user.updateUserProfile, { bio }, user.ctx());

  return { ...user, profile };
}

/**
 * Creates a user with a bio at the maximum length the contract allows
 */
export async function createUserWithMaxBio() {
  return createUserWithBio('a'.repeat(500));
}

/**
 * Creates a user who has unlocked an achievement.
 *
 * There is no endpoint that grants achievements, so the fixture goes through the repository
 * (`test/integration/fixtures/repository.fixtures.ts`).
 */
export async function createUserWithAchievement(achievementId: UserAchievementId) {
  const user = await createUser();
  await getUserAchievementRepository().ensureUnlocked(user.user.id, achievementId);

  return user;
}

/**
 * Creates a user with a badge selected, unlocking the achievement the badge requires first
 */
export async function createUserWithBadge(badgeId: BadgeId) {
  const requiredAchievement = BADGES_META.find((badge) => badge.id === badgeId)?.requiresAchievement;
  const user = requiredAchievement ? await createUserWithAchievement(requiredAchievement) : await createUser();
  const profile = await call(appRouter.user.updateUserBadge, { badgeId }, user.ctx());

  return { ...user, profile };
}

// ============================================================================
// Transport Helpers
// ============================================================================

/**
 * Sends a Request through the same handler every backend adapter uses (REST, RPC, module HTTP handlers).
 * Use it for cookie/header behavior that `call()` bypasses.
 */
export async function sendRequest(path: string, init?: RequestInit) {
  return container.resolve(ApiRequestHandler).handle(new Request(`http://localhost${path}`, init));
}

// ============================================================================
// Async Wait Utilities
// ============================================================================

/**
 * Waits for a condition to be true
 *
 * @param condition - Function returning boolean or promise of boolean
 * @param timeout - Max time to wait in milliseconds (default 5000)
 */
export async function waitFor(condition: () => boolean | Promise<boolean>, timeout = 5000) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error('Condition not met within timeout');
}

// Usage example:
// await waitFor(async () => {
//   const profile = await getUserProfileRepository().findByUserId(userId);
//   return profile?.selectedBadge === BADGE_IDS.DEFAULT;
// });
