import type { UserAchievementId } from '@startername/common/constants/achievements';
import type { PayloadToken, TokenPayload } from '@startername/common/helpers/payload-token.helper';

export interface iAchievementContext {
  unlock: <T extends UserAchievementId>(
    userId: string,
    achievementId: T,
    data?: Record<string, unknown>,
  ) => Promise<unknown>;
}

export interface iAchievementDefinition<TEvent extends PayloadToken<unknown> = PayloadToken<unknown>> {
  id: UserAchievementId;
  listensTo: TEvent[];
  handle: (payload: TokenPayload<TEvent>, context: iAchievementContext) => Promise<unknown>;
}
