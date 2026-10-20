import { em } from 'enumwaii';

import { definePayloadTokens, payloadOf } from '@startername/common/helpers/payload-token-set.helper';

const authEventNamesEnumwaii = em({
  /** A new user completed registration. */
  USER_AFTER_REGISTERED: 'auth.user-after-registered',
});

/** Events the auth feature emits on the event bus. */
export const AUTH_EVENTS = definePayloadTokens(authEventNamesEnumwaii, {
  USER_AFTER_REGISTERED: payloadOf<{ userId: string }>(),
});
