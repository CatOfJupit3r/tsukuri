import type {
  AuthAccountProviderId,
  iAuthAccountRecordResponse,
  iAuthUserListItemResponse,
  iAuthUserRecordResponse,
} from './auth-user.repository.types';

export interface iAuthUserRepository {
  findUserById: (userId: string) => Promise<iAuthUserRecordResponse | null>;
  findUserByEmail: (email: string) => Promise<iAuthUserRecordResponse | null>;
  listUsers: () => Promise<iAuthUserListItemResponse[]>;
  countUsers: () => Promise<number>;
  countActiveSessions: (now: Date) => Promise<number>;
  findAccountByUserIdAndProviderId: (
    userId: string,
    providerId: AuthAccountProviderId,
  ) => Promise<iAuthAccountRecordResponse | null>;
  findAccountByAccountIdAndProviderId: (
    accountId: string,
    providerId: AuthAccountProviderId,
  ) => Promise<iAuthAccountRecordResponse | null>;
  updateAccountAccountId: (accountRecordId: string, accountId: string) => Promise<iAuthAccountRecordResponse | null>;
  deleteUsersByEmail: (email: string) => Promise<number>;
  deleteAccountsByAccountId: (accountId: string) => Promise<number>;
}
