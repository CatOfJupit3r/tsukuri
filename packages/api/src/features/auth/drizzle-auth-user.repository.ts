import { and, count as countFn, eq, gt } from 'drizzle-orm';
import { singleton } from 'tsyringe';

import { accounts, sessions, users } from '#~/features/auth/auth.schema';
import { PostgresService } from '#~/features/postgres/postgres.service';

import type { iAuthUserRepository } from './auth-user.repository';
import type {
  AuthAccountProviderId,
  iAuthAccountRecordResponse,
  iAuthUserListItemResponse,
  iAuthUserRecordResponse,
} from './auth-user.repository.types';
import { AuthUserResolver } from './auth-user.resolver';

@singleton()
export class DrizzleAuthUserRepository implements iAuthUserRepository {
  constructor(
    private readonly postgresService: PostgresService,
    private readonly authUserResolver: AuthUserResolver,
  ) {}

  public async findUserById(userId: string): Promise<iAuthUserRecordResponse | null> {
    const [user] = await this.postgresService.getDb().select().from(users).where(eq(users.id, userId)).limit(1);
    return user ? this.authUserResolver.toUserResponse(user) : null;
  }

  public async findUserByEmail(email: string): Promise<iAuthUserRecordResponse | null> {
    const [user] = await this.postgresService.getDb().select().from(users).where(eq(users.email, email)).limit(1);
    return user ? this.authUserResolver.toUserResponse(user) : null;
  }

  public async listUsers(): Promise<iAuthUserListItemResponse[]> {
    return this.postgresService.getDb().select({ id: users.id, name: users.name }).from(users);
  }

  public async countUsers(): Promise<number> {
    const [result] = await this.postgresService.getDb().select({ count: countFn() }).from(users);
    return Number(result?.count ?? 0);
  }

  public async countActiveSessions(now: Date): Promise<number> {
    const [result] = await this.postgresService
      .getDb()
      .select({ count: countFn() })
      .from(sessions)
      .where(gt(sessions.expiresAt, now));
    return Number(result?.count ?? 0);
  }

  public async findAccountByUserIdAndProviderId(
    userId: string,
    providerId: AuthAccountProviderId,
  ): Promise<iAuthAccountRecordResponse | null> {
    const [account] = await this.postgresService
      .getDb()
      .select()
      .from(accounts)
      .where(and(eq(accounts.userId, userId), eq(accounts.providerId, providerId)))
      .limit(1);
    return account ? this.authUserResolver.toAccountResponse(account) : null;
  }

  public async findAccountByAccountIdAndProviderId(
    accountId: string,
    providerId: AuthAccountProviderId,
  ): Promise<iAuthAccountRecordResponse | null> {
    const [account] = await this.postgresService
      .getDb()
      .select()
      .from(accounts)
      .where(and(eq(accounts.accountId, accountId), eq(accounts.providerId, providerId)))
      .limit(1);
    return account ? this.authUserResolver.toAccountResponse(account) : null;
  }

  public async updateAccountAccountId(
    accountRecordId: string,
    accountId: string,
  ): Promise<iAuthAccountRecordResponse | null> {
    const [account] = await this.postgresService
      .getDb()
      .update(accounts)
      .set({ accountId, updatedAt: new Date() })
      .where(eq(accounts.id, accountRecordId))
      .returning();
    return account ? this.authUserResolver.toAccountResponse(account) : null;
  }

  public async deleteUsersByEmail(email: string): Promise<number> {
    const rows = await this.postgresService
      .getDb()
      .delete(users)
      .where(eq(users.email, email))
      .returning({ id: users.id });
    return rows.length;
  }

  public async deleteAccountsByAccountId(accountId: string): Promise<number> {
    const rows = await this.postgresService
      .getDb()
      .delete(accounts)
      .where(eq(accounts.accountId, accountId))
      .returning({ id: accounts.id });
    return rows.length;
  }
}
