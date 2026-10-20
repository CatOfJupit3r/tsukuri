import { eq } from 'drizzle-orm';
import { singleton } from 'tsyringe';

import { errorCodes, errorMessages } from '@startername/common/generated/error-codes';

import { DatabaseService } from '#~/features/database/database.service';
import { generatePublicCode } from '#~/features/user/public-code';
import { userProfiles } from '#~/features/user/user-profile.schema';
import { expectDefined } from '#~/lib/orpc-error-wrapper';

import type { iUpsertUserProfileInput } from '../user.types';
import type { iUserProfileRepository } from './user-profile.repository';
import { UserProfileResolver } from './user-profile.resolver';

function getDefaultValues(userId: string) {
  const values: typeof userProfiles.$inferInsert = {
    userId,
    bio: '',
    selectedBadge: null,
    publicCode: generatePublicCode(),
  };

  return values;
}

@singleton()
export class DrizzleUserProfileRepository implements iUserProfileRepository {
  public constructor(
    private readonly databaseService: DatabaseService,
    private readonly userProfileResolver: UserProfileResolver,
  ) {}

  public async findByUserId(userId: string) {
    const [profile] = await this.databaseService
      .getDb()
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId))
      .limit(1);
    return profile ? this.userProfileResolver.toUserProfileResponse(profile) : null;
  }

  public async deleteByUserId(userId: string) {
    const rows = await this.databaseService
      .getDb()
      .delete(userProfiles)
      .where(eq(userProfiles.userId, userId))
      .returning({ userId: userProfiles.userId });
    return rows.length > 0;
  }

  public async ensureExists(userId: string) {
    const [inserted] = await this.databaseService
      .getDb()
      .insert(userProfiles)
      .values(getDefaultValues(userId))
      .onConflictDoNothing({ target: userProfiles.userId })
      .returning();

    if (inserted) return this.userProfileResolver.toUserProfileResponse(inserted);

    const existing = await this.findByUserId(userId);
    return expectDefined(existing, errorMessages.get(errorCodes.USER_PROFILE_UPSERT_FAILED));
  }

  public async upsert(userId: string, input: iUpsertUserProfileInput) {
    const update = this.userProfileResolver.toUserProfileUpdate(input);

    const [profile] = await this.databaseService
      .getDb()
      .insert(userProfiles)
      .values({ ...getDefaultValues(userId), ...update })
      .onConflictDoUpdate({ target: userProfiles.userId, set: update })
      .returning();

    return this.userProfileResolver.toUserProfileResponse(
      expectDefined(profile, errorMessages.get(errorCodes.USER_PROFILE_UPSERT_FAILED)),
    );
  }
}
