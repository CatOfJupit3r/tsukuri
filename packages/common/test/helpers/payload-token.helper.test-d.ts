import { em } from 'enumwaii';
import z from 'zod';

import { definePayloadTokens, payloadMessageSchema, payloadOf } from '../../src/helpers/payload-token-set.helper';
import { PayloadToken } from '../../src/helpers/payload-token.helper';
import type { TokenPayload, TokenName } from '../../src/helpers/payload-token.helper';

const cartEventNamesEnumwaii = em({
  ITEM_ADDED: 'cart.item-added',
  CHECKED_OUT: 'cart.checked-out',
});
const CART_EVENT_NAMES = cartEventNamesEnumwaii.enum;

const CART_EVENTS = definePayloadTokens(cartEventNamesEnumwaii, {
  ITEM_ADDED: z.object({ sku: z.string(), quantity: z.number().int().positive() }),
  CHECKED_OUT: z.object({ orderId: z.string() }),
});

const sessionEventNamesEnumwaii = em({ STARTED: 'session.started', ENDED: 'session.ended' });

const SESSION_EVENTS = definePayloadTokens(sessionEventNamesEnumwaii, {
  STARTED: payloadOf<{ userId: string }>(),
  ENDED: z.object({ userId: z.string(), durationMs: z.number() }),
});

/** A minimal typed sender, as an event bus or channel would declare it. */
function send<TPayload>(token: PayloadToken<TPayload>, payload: NoInfer<TPayload>) {
  return token.message(payload);
}

describe('definePayloadTokens', () => {
  it('rejects payloads for keys the enum does not declare', () => {
    expectTypeOf(
      definePayloadTokens(sessionEventNamesEnumwaii, {
        STARTED: payloadOf<{ userId: string }>(),
        ENDED: payloadOf<{ userId: string }>(),
        // @ts-expect-error misspelled member
        STOPED: payloadOf<{ userId: string }>(),
      }),
    ).toBeObject();
  });

  it('types each token by its spec and name', () => {
    expectTypeOf<TokenPayload<typeof SESSION_EVENTS.STARTED>>().toEqualTypeOf<{ userId: string }>();
    expectTypeOf<TokenPayload<typeof CART_EVENTS.ITEM_ADDED>>().toEqualTypeOf<{ sku: string; quantity: number }>();
    expectTypeOf<TokenName<typeof CART_EVENTS.ITEM_ADDED>>().toEqualTypeOf<typeof CART_EVENT_NAMES.ITEM_ADDED>();

    // @ts-expect-error in-process tokens have no schema to parse with
    expectTypeOf(SESSION_EVENTS.STARTED.parse).toBeFunction();
  });
});

describe('PayloadToken', () => {
  it('checks payloads against the token', () => {
    // @ts-expect-error the payload does not match the token
    expectTypeOf(send(SESSION_EVENTS.STARTED, { userId: 1 })).toBeObject();
    const unchecked: unknown = { userId: 'u1' };
    // @ts-expect-error unvalidated input is not a payload
    expectTypeOf(send(SESSION_EVENTS.STARTED, unchecked)).toBeObject();
  });

  it('takes its name from an enumwaii member, never a raw string', () => {
    expectTypeOf(new PayloadToken<{ userId: string }>(CART_EVENT_NAMES.CHECKED_OUT)).toBeObject();

    // @ts-expect-error raw strings are not token names
    expectTypeOf(new PayloadToken<{ userId: string }>('cart.checked-out')).toBeObject();
  });
});

describe('payloadMessageSchema', () => {
  it('only accepts sets whose tokens can all be validated', () => {
    // @ts-expect-error STARTED stays in the process and has no schema
    expectTypeOf(payloadMessageSchema(SESSION_EVENTS)).toBeObject();
  });
});
