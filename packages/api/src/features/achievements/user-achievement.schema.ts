import { index, jsonb, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

import type { UserAchievementId } from '@startername/common/constants/achievements';

import { users } from '#~/features/auth/auth.schema';
import { idColumn, idPrimaryKey } from '#~/features/database/schema.helpers';

export const userAchievements = pgTable(
  'user_achievements',
  {
    id: idPrimaryKey(),
    userId: idColumn('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    achievementId: text('achievement_id').$type<UserAchievementId>().notNull(),
    unlockedAt: timestamp('unlocked_at', { withTimezone: true }).notNull(),
    data: jsonb('data').$type<Record<string, unknown> | null>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('user_achievements_user_achievement_uidx').on(table.userId, table.achievementId),
    index('user_achievements_user_idx').on(table.userId),
  ],
);
