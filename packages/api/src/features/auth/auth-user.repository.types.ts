import { em } from 'enumwaii';

import type { accounts, users } from '#~/features/auth/auth.schema';

type UserRow = typeof users.$inferSelect;
type AccountRow = typeof accounts.$inferSelect;

export interface iAuthUserRecordResponse extends Omit<UserRow, 'username' | 'displayUsername' | 'image'> {
  image?: string;
}

type OptionalAuthAccountRecordFields =
  'accessToken' | 'refreshToken' | 'idToken' | 'accessTokenExpiresAt' | 'refreshTokenExpiresAt' | 'scope' | 'password';

export interface iAuthAccountRecordResponse extends Omit<AccountRow, OptionalAuthAccountRecordFields> {
  accessToken?: string;
  refreshToken?: string;
  idToken?: string;
  accessTokenExpiresAt?: Date;
  refreshTokenExpiresAt?: Date;
  scope?: string;
  password?: string;
}

export type iAuthUserListItemResponse = Pick<iAuthUserRecordResponse, 'id' | 'name'>;

const authAccountProviderIdsEnumwaii = em({ CREDENTIAL: 'credential' });

export const AUTH_ACCOUNT_PROVIDER_IDS = authAccountProviderIdsEnumwaii.enum;
export type AuthAccountProviderId = (typeof authAccountProviderIdsEnumwaii)['~type'];
