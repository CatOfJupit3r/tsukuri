import { inject, injectable } from 'tsyringe';

import type { iAuthUserRepository } from './auth-user.repository';
import { AUTH_USER_REPOSITORY_TOKEN } from './auth.tokens';

@injectable()
export class AuthStatisticsService {
  constructor(@inject(AUTH_USER_REPOSITORY_TOKEN) private readonly authUserRepository: iAuthUserRepository) {}

  public async getMetrics() {
    const [totalUsers, activeSessions] = await Promise.all([
      this.authUserRepository.countUsers(),
      this.authUserRepository.countActiveSessions(new Date()),
    ]);
    return { totalUsers, activeSessions };
  }

  public async listAllUsers() {
    return this.authUserRepository.listUsers();
  }
}
