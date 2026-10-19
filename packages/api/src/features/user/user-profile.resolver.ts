import { singleton } from 'tsyringe';

import type { userProfiles } from '#~/features/user/user-profile.schema';
import { createOwnPropertyUpdateResolver, createRowResolver } from '#~/lib/row-resolver';

import type { iUpsertUserProfileInput, iUserProfileResponse } from './user.types';

type UserProfileRow = typeof userProfiles.$inferSelect;
type UserProfileInsert = typeof userProfiles.$inferInsert;

@singleton()
export class UserProfileResolver {
  public toUserProfileResponse = createRowResolver<UserProfileRow, iUserProfileResponse>();

  public toUserProfileUpdate = createOwnPropertyUpdateResolver<iUpsertUserProfileInput, UserProfileInsert>({
    fields: ['bio', 'selectedBadge', 'publicCode'],
  });
}
