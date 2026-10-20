import { useQuery } from '@tanstack/react-query';

import type { ORPCOutputs } from '#~/utils/orpc';
import { tanstackRPC } from '#~/utils/tanstack-orpc';

export type UserProfileQueryReturnType = ORPCOutputs['user']['getUserProfile'];

export function useUserProfile() {
  return useQuery(tanstackRPC.user.getUserProfile.queryOptions());
}
