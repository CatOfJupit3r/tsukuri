import { useMutation } from '@tanstack/react-query';

import { BadgeIdSchema } from '@startername/common/constants/badges';

import { toastError, toastSuccess } from '#~/components/toastifications/create-jsx-toasts';
import type { ORPCOutputs } from '#~/utils/orpc';
import { tanstackRPC } from '#~/utils/tanstack-orpc';

export type UserProfileQueryReturnType = ORPCOutputs['user']['getUserProfile'];

export const updateUserBadgeMutationOptions = tanstackRPC.user.updateUserBadge.mutationOptions({
  async onMutate(variables, ctx) {
    const key = tanstackRPC.user.getUserProfile.queryKey();

    await ctx.client.cancelQueries({ queryKey: key });

    const previous = ctx.client.getQueryData<UserProfileQueryReturnType>(key);

    // variables.badgeId is the contract's raw input type; parse it back into
    // the branded output type the optimistic cache entry expects.
    const optimisticBadgeId = BadgeIdSchema.parse(variables.badgeId);

    ctx.client.setQueryData<UserProfileQueryReturnType>(key, (current) =>
      current ? { ...current, selectedBadge: optimisticBadgeId } : current,
    );

    return { previous };
  },
  onError: (_error, _variables, context, ctx) => {
    const key = tanstackRPC.user.getUserProfile.queryKey();

    if (context?.previous) {
      ctx.client.setQueryData<UserProfileQueryReturnType>(key, context.previous);
    } else {
      void ctx.client.invalidateQueries({ queryKey: key });
    }

    toastError('Failed to update badge');
  },
  onSuccess: (data, _variables, _context, ctx) => {
    const key = tanstackRPC.user.getUserProfile.queryKey();

    ctx.client.setQueryData<UserProfileQueryReturnType>(key, data);
    toastSuccess('Badge updated successfully');
  },
});

export function useUpdateUserBadge() {
  const { mutate: updateUserBadge, isPending } = useMutation(updateUserBadgeMutationOptions);

  return {
    updateUserBadge,
    isPending,
  };
}
