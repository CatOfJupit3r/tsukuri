import { BETTER_AUTH_SECRET_EXAMPLE } from '#~/constants/better-auth-secret';
import { INTERNAL_RENDER_SECRET_EXAMPLE } from '#~/constants/internal-render-secret';
import { AUTH_SESSION_STORES } from '#~/enums/auth-session-stores.enums';
import { ORIGIN_GUARD_MODES } from '#~/enums/origin-guard-modes.enums';

import { AUTH_SESSION_STORES as API_AUTH_SESSION_STORES } from '../../../api/src/features/auth/auth-session-stores.enums';
import { BETTER_AUTH_SECRET_PLACEHOLDER } from '../../../api/src/features/auth/auth.constants';
import { REQUEST_ORIGIN_MODES } from '../../../api/src/features/http/request-origin-modes.enums';
import { INTERNAL_RENDER_SECRET_PLACEHOLDER } from '../../../api/src/features/render-secret/internal-render-secret.constants';

// The generator is published on its own and cannot depend on the API, so it keeps its own copy of what the API
// refuses or understands. These tests fail when the two drift apart.
describe('generator values that the API checks', () => {
  it('writes the secret placeholders production refuses', () => {
    expect(BETTER_AUTH_SECRET_EXAMPLE).toBe(BETTER_AUTH_SECRET_PLACEHOLDER);
    expect(INTERNAL_RENDER_SECRET_EXAMPLE).toBe(INTERNAL_RENDER_SECRET_PLACEHOLDER);
  });

  it('offers exactly the origin guard modes the API understands', () => {
    expect(Object.values(ORIGIN_GUARD_MODES).sort()).toEqual(Object.values(REQUEST_ORIGIN_MODES).sort());
  });

  it('offers exactly the auth session stores the API understands', () => {
    expect(Object.values(AUTH_SESSION_STORES).sort()).toEqual(Object.values(API_AUTH_SESSION_STORES).sort());
  });
});
