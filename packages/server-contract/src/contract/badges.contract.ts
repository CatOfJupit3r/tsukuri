import { oc } from '@orpc/contract';
import z from 'zod';

import { UserAchievementIdSchema } from '@startername/common/constants/achievements';
import { BadgeIdSchema } from '@startername/common/constants/badges';

const BADGE_META_SCHEMA = z.object({
  id: BadgeIdSchema,
  label: z.string(),
  description: z.string(),
  icon: z.string().optional(),
  requiresAchievement: UserAchievementIdSchema.optional(),
});

const listBadges = oc
  .route({
    path: '/list',
    method: 'GET',
    summary: 'List all available badges',
    description:
      'Returns metadata for all available badges in the system. This includes information about which achievements are required to unlock specific badges.',
  })
  .output(z.array(BADGE_META_SCHEMA));

export const badgesContract = oc.prefix('/badges').router({
  listBadges,
});
