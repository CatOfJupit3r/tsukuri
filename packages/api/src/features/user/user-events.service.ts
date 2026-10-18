import { inject, singleton } from 'tsyringe';

import { UserAfterRegisteredListener } from '#~/features/auth/auth.listeners';
import { EventBus } from '#~/features/events/event-bus';
import { LoggerFactory } from '#~/features/logger/logger.factory';
import type { iWithLogger } from '#~/features/logger/logger.types';

import type { iUserProfileRepository } from './user-profile.repository';
import { USER_PROFILE_REPOSITORY_TOKEN } from './user.tokens';

@singleton()
export class UserEventsService implements iWithLogger {
  public readonly logger;

  constructor(
    private readonly eventBus: EventBus,
    @inject(USER_PROFILE_REPOSITORY_TOKEN)
    private readonly userProfileRepository: iUserProfileRepository,
    loggerFactory: LoggerFactory,
  ) {
    this.logger = loggerFactory.create('user-events');
  }

  public initialize() {
    this.eventBus.on(UserAfterRegisteredListener, async ({ userId }) => {
      try {
        await this.userProfileRepository.ensureExists(userId);
        this.logger.info('User profile created successfully', { userId });
      } catch (error) {
        this.logger.error('User profile creation failed', { userId, error });
      }
    });
  }
}
