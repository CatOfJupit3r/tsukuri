import { base, publicProcedure } from '#~/lib/orpc';

import { BadgesService } from './badges.service';

export const badgesRouter = base.badges.router({
  listBadges: publicProcedure.badges.listBadges.handler(async ({ context }) =>
    context.resolve(BadgesService).listAllBadges(),
  ),
});
