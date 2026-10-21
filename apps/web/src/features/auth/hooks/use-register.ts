import { useMutation, useQueryClient } from '@tanstack/react-query';

import { authClientService } from '#~/features/auth/auth-client.service';
import { toastBetterAuthError } from '#~/features/auth/auth-toasts';
import { USE_ME_QUERY_KEYS } from '#~/features/auth/hooks/use-me';

export const useRegister = () => {
  const queryClient = useQueryClient();

  const {
    mutateAsync: mutate,
    isPending,
    isSuccess,
  } = useMutation({
    mutationFn: async ({
      email,
      password,
      name,
      username,
    }: {
      email: string;
      username: string;
      name: string;
      password: string;
    }) =>
      authClientService.getInstance().signUp.email({
        email,
        name,
        username,
        password,
        fetchOptions: { throw: true },
      }),
    onError: (err) => {
      toastBetterAuthError('Registration Failed', err);
    },
    onSuccess: async (_) => {
      await queryClient.invalidateQueries({
        queryKey: USE_ME_QUERY_KEYS(),
      });
    },
  });

  return {
    mutate,
    isPending,
    isSuccess,
  };
};
