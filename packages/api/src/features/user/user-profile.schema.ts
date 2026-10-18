import { pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

import type { BadgeId } from '@startername/common/constants/badges';

import { users } from '#~/features/auth/auth.schema';
import { idColumn } from '#~/features/database/schema.helpers';

export const userProfiles = pgTable(
  'profile',
  {
    id: idColumn('id').notNull().defaultRandom(),
    userId: idColumn('user_id')
      .notNull()
      .primaryKey()
      .references(() => users.id, { onDelete: 'cascade' }),
    bio: text('bio').notNull().default(''),
    selectedBadge: text('selected_badge').$type<BadgeId | null>(),
    publicCode: text('public_code').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('user_profiles_id_uidx').on(table.id),
    uniqueIndex('user_profiles_public_code_uidx').on(table.publicCode),
  ],
);
