import { mutationOptions, useMutation, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { USE_ME_QUERY_KEYS } from '#~/features/auth/hooks/use-me';
import { getBackendURL, getForwardedRequestHeaders } from '#~/utils/backend-url';
import { tanstackRPC } from '#~/utils/tanstack-orpc';

const listAllUsersQueryOptions = tanstackRPC.auth.devToolsListAllUsers.queryOptions();

async function fetchImpersonate(userId: string) {
  const response = await fetch(getBackendURL(`/dev-tools/impersonate/${userId}`), {
    method: 'GET',
    headers: getForwardedRequestHeaders(),
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error('Failed to impersonate user');
  }
}

const impersonateMutationOptions = mutationOptions({
  mutationFn: async (userId: string) => fetchImpersonate(userId),
  onError: (error) => {
    console.error('Impersonation error:', error);
  },
  onSuccess: (_, __, ___, ctx) => {
    void ctx.client.refetchQueries({
      queryKey: USE_ME_QUERY_KEYS(),
    });
  },
});

function useImpersonate() {
  const { mutateAsync, isPending, isError } = useMutation(impersonateMutationOptions);
  return { mutate: mutateAsync, isPending, isError };
}

function useAvailableUsers() {
  const { data, isPending } = useQuery(listAllUsersQueryOptions);

  const options = useMemo(() => data?.map((user) => ({ label: user.name, value: user.id })) ?? [], [data]);

  return { options, isPending };
}

export function DevImpersonatePanel() {
  const { options, isPending: isUsersPending } = useAvailableUsers();
  const { mutate, isPending: isImpersonationPending, isError } = useImpersonate();

  return (
    <div className="size-full min-h-0 min-w-0">
      <div className="w-full max-w-md space-y-3 p-4">
        <div>
          <h2 className="text-base font-semibold">Impersonate a user</h2>
          <p className="text-sm text-muted-foreground">Switch the current development session to another user.</p>
        </div>
        {/* Exception: keep this menu native because react-select's portaled menu is not selectable in Devtools. */}
        <select
          id="dev-impersonate-user"
          defaultValue=""
          aria-label="Select a user to impersonate"
          className="min-h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isUsersPending || isImpersonationPending}
          onChange={(event) => {
            const userId = event.target.value;
            if (!userId) return;
            void mutate(userId);
          }}
        >
          <option value="" disabled>
            {isUsersPending ? 'Loading users...' : 'Select a user'}
          </option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {isError ? <p className="text-sm text-destructive">Could not impersonate that user.</p> : null}
      </div>
    </div>
  );
}
