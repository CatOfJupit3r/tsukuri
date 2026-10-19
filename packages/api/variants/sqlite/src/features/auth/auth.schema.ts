import { relations } from 'drizzle-orm';
import { index, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

import { booleanColumn, idColumn, idPrimaryKey, timestampColumn } from '#~/features/database/schema.helpers';

export const users = sqliteTable(
  'users',
  {
    id: idPrimaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    username: text('username'),
    displayUsername: text('display_username'),
    emailVerified: booleanColumn('email_verified').notNull().default(false),
    image: text('image'),
    createdAt: timestampColumn('created_at').notNull(),
    updatedAt: timestampColumn('updated_at').notNull(),
  },
  (table) => [uniqueIndex('users_email_uidx').on(table.email), uniqueIndex('users_username_uidx').on(table.username)],
);

export const sessions = sqliteTable(
  'sessions',
  {
    id: idPrimaryKey(),
    userId: idColumn('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: text('token').notNull(),
    expiresAt: timestampColumn('expires_at').notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestampColumn('created_at').notNull(),
    updatedAt: timestampColumn('updated_at').notNull(),
  },
  (table) => [
    uniqueIndex('sessions_token_uidx').on(table.token),
    index('sessions_user_idx').on(table.userId),
    index('sessions_expires_at_idx').on(table.expiresAt),
  ],
);

export const accounts = sqliteTable(
  'accounts',
  {
    id: idPrimaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: idColumn('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestampColumn('access_token_expires_at'),
    refreshTokenExpiresAt: timestampColumn('refresh_token_expires_at'),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestampColumn('created_at').notNull(),
    updatedAt: timestampColumn('updated_at').notNull(),
  },
  (table) => [
    uniqueIndex('accounts_provider_account_uidx').on(table.providerId, table.accountId),
    index('accounts_user_idx').on(table.userId),
  ],
);

export const verifications = sqliteTable(
  'verifications',
  {
    id: idPrimaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestampColumn('expires_at').notNull(),
    createdAt: timestampColumn('created_at'),
    updatedAt: timestampColumn('updated_at'),
  },
  (table) => [
    index('verifications_identifier_idx').on(table.identifier),
    index('verifications_expires_at_idx').on(table.expiresAt),
  ],
);

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));
