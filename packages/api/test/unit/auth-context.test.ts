import { provideAuthSession } from '#~/features/auth/auth.context';
import { AuthService } from '#~/features/auth/auth.service';
import { RequestContextStorage } from '#~/features/request-context/request-context.storage';

import { mockContainerResolve } from '../helpers/unit-mocks';

function mockAuth(session: { user: { id: string } } | null) {
  const requestContext = { assignUserId: vi.fn() };
  const authService = { getInstance: () => ({ api: { getSession: vi.fn(async () => session) } }) };
  mockContainerResolve([
    [AuthService, authService],
    [RequestContextStorage, requestContext],
  ]);
  return requestContext;
}

describe('provideAuthSession', () => {
  it('adds the session to the context and tags the request with the user', async () => {
    const requestContext = mockAuth({ user: { id: 'user-1' } });

    const context = await provideAuthSession(new Request('http://localhost/rpc'));

    expect(context.session?.user.id).toBe('user-1');
    expect(requestContext.assignUserId).toHaveBeenCalledWith('user-1');
  });

  it('adds a null session for anonymous requests', async () => {
    const requestContext = mockAuth(null);

    expect(await provideAuthSession(new Request('http://localhost/rpc'))).toEqual({ session: null });
    expect(requestContext.assignUserId).not.toHaveBeenCalled();
  });
});
