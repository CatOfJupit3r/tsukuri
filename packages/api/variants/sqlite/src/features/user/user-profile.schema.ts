import { sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { randomUUID } from 'node:crypto';

import type { BadgeId } from '@startername/common/constants/badges';

import { users } from '#~/features/auth/auth.schema';
import { idColumn, timestampColumn } from '#~/features/database/schema.helpers';

export const userProfiles = sqliteTable(
  'profile',
  {
    id: idColumn('id')
      .notNull()
      .$defaultFn(() => randomUUID()),
    userId: idColumn('user_id')
      .notNull()
      .primaryKey()
      .references(() => users.id, { onDelete: 'cascade' }),
    bio: text('bio').notNull().default(''),
    selectedBadge: text('selected_badge').$type<BadgeId | null>(),
    publicCode: text('public_code').notNull(),
    createdAt: timestampColumn('created_at')
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestampColumn('updated_at')
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex('user_profiles_id_uidx').on(table.id),
    uniqueIndex('user_profiles_public_code_uidx').on(table.publicCode),
  ],
);
