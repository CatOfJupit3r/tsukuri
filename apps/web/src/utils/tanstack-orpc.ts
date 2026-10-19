import { createTanstackQueryUtils } from '@orpc/tanstack-query';

import { orpcClient } from './orpc';

export const tanstackRPC = createTanstackQueryUtils(orpcClient);
