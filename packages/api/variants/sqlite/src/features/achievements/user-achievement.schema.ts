import { index, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

import type { UserAchievementId } from '@startername/common/constants/achievements';

import { users } from '#~/features/auth/auth.schema';
import { idColumn, idPrimaryKey, timestampColumn } from '#~/features/database/schema.helpers';

export const userAchievements = sqliteTable(
  'user_achievements',
  {
    id: idPrimaryKey(),
    userId: idColumn('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    achievementId: text('achievement_id').$type<UserAchievementId>().notNull(),
    unlockedAt: timestampColumn('unlocked_at').notNull(),
    data: text('data', { mode: 'json' }).$type<Record<string, unknown> | null>(),
    createdAt: timestampColumn('created_at')
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestampColumn('updated_at')
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex('user_achievements_user_achievement_uidx').on(table.userId, table.achievementId),
    index('user_achievements_user_idx').on(table.userId),
  ],
);
