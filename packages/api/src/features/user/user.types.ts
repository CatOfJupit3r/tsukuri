import type { BadgeId } from '@startername/common/constants/badges';

import type { userProfiles } from '#~/features/user/user-profile.schema';

type UserProfileRow = typeof userProfiles.$inferSelect;

export type iUserProfileResponse = Omit<UserProfileRow, 'selectedBadge'> & {
  selectedBadge?: BadgeId | null;
};

export interface iUpsertUserProfileInput {
  bio?: string;
  selectedBadge?: BadgeId | null;
  publicCode?: string;
}
