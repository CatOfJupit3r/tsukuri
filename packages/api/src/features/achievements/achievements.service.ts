import { inject, singleton } from 'tsyringe';

import type { UserAchievementId } from '@startername/common/constants/achievements';

import { AchievementUnlockedListener } from '#~/features/achievements/achievements.listeners';
import type { iAchievementContext, iAchievementDefinition } from '#~/features/achievements/achievements.types';
import type { iUserAchievementRepository } from '#~/features/achievements/user-achievement.repository';
import { CACHE_TTL } from '#~/features/cache/cache.constants';
import { CacheService } from '#~/features/cache/cache.service';
import { EventBus } from '#~/features/events/event-bus';
import { LoggerFactory } from '#~/features/logger/logger.factory';
import type { iWithLogger } from '#~/features/logger/logger.types';

import { buildAchievementsCacheKey } from './achievements.cache-keys';
import { USER_ACHIEVEMENTS_META } from './achievements.constants';
import { USER_ACHIEVEMENT_REPOSITORY_TOKEN } from './achievements.tokens';
import { betaTesterAchievement } from './concrete-achievements/beta-tester.achievement';

@singleton()
export class AchievementsService implements iWithLogger {
  private readonly achievements: iAchievementDefinition[] = [betaTesterAchievement];

  public readonly logger: iWithLogger['logger'];

  private readonly context: iAchievementContext = {
    unlock: async (userId: string, achievementId: UserAchievementId, data?: Record<string, unknown>) => {
      await this.userAchievementRepository.ensureUnlocked(userId, achievementId, data);
      await this.eventBus.emitAsync(AchievementUnlockedListener, { userId, achievementId });
    },
  };

  constructor(
    private readonly eventBus: EventBus,
    @inject(USER_ACHIEVEMENT_REPOSITORY_TOKEN)
    private readonly userAchievementRepository: iUserAchievementRepository,
    private readonly cacheService: CacheService,
    loggerFactory: LoggerFactory,
  ) {
    this.logger = loggerFactory.create('achievements');
  }

  public initialize() {
    for (const achievement of this.achievements) {
      for (const listener of achievement.listensTo) {
        this.eventBus.on(listener, async (payload) => {
          try {
            await achievement.handle(payload, this.context);
          } catch (error) {
            this.logger.error(`Error handling achievement ${achievement.id} for event ${listener.name}:`, { error });
          }
        });
      }
    }

    this.eventBus.on(AchievementUnlockedListener, async ({ userId, achievementId }) => {
      await this.cacheService.delete(buildAchievementsCacheKey.ofUser(userId));
      this.logger.debug('Achievement unlocked, invalidated user achievements cache', { userId, achievementId });
    });
  }

  public async listAllAchievements() {
    return this.cacheService.cached(
      buildAchievementsCacheKey.all(),
      CACHE_TTL.STATIC,
      async () => USER_ACHIEVEMENTS_META,
    );
  }

  public async getUserAchievements(userId: string) {
    return this.cacheService.cached(buildAchievementsCacheKey.ofUser(userId), CACHE_TTL.USER_DATA, async () => {
      const userAchievements = await this.userAchievementRepository.listByUserId(userId);

      return userAchievements.map((achievement) => {
        const meta = USER_ACHIEVEMENTS_META.find((item) => item.id === achievement.achievementId);
        return {
          id: achievement.achievementId,
          unlockedAt: achievement.unlockedAt,
          data: achievement.data,
          meta: meta ?? {
            id: achievement.achievementId,
            label: achievement.achievementId,
            description: 'Achievement',
          },
        };
      });
    });
  }
}
