import { singleton } from 'tsyringe';

import type { accounts, users } from '#~/features/auth/auth.schema';
import { createRowResolver } from '#~/lib/row-resolver';

import type { iAuthAccountRecordResponse, iAuthUserRecordResponse } from './auth-user.repository.types';

type UserRow = typeof users.$inferSelect;
type AccountRow = typeof accounts.$inferSelect;

@singleton()
export class AuthUserResolver {
  public toUserResponse = createRowResolver<UserRow, iAuthUserRecordResponse>({
    optional: ['image'],
    omit: ['username', 'displayUsername'],
  });

  public toAccountResponse = createRowResolver<AccountRow, iAuthAccountRecordResponse>({
    optional: [
      'accessToken',
      'refreshToken',
      'idToken',
      'accessTokenExpiresAt',
      'refreshTokenExpiresAt',
      'scope',
      'password',
    ],
  });
}
