import { useMutation, useQueryClient } from '@tanstack/react-query';

import AuthService from '#~/features/auth/auth-client.service';
import { toastBetterAuthError } from '#~/features/auth/auth-toasts';
import { USE_ME_QUERY_KEYS } from '#~/features/auth/hooks/use-me';

const useLogin = () => {
  const queryClient = useQueryClient();

  const {
    mutateAsync: mutate,
    isPending,
    isSuccess,
  } = useMutation({
    mutationFn: async ({ username, password }: { username: string; password: string }) =>
      AuthService.getInstance().signIn.username({
        username,
        password,
        rememberMe: true,
        fetchOptions: { throw: true },
      }),
    onError: (err) => {
      toastBetterAuthError('Login Failed', err);
    },
    onSuccess: async () => {
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

export default useLogin;
