import { em } from 'enumwaii';
import z from 'zod';

import { definePayloadTokens, payloadMessageSchema, payloadOf } from '../../src/helpers/payload-token-set.helper';
import { PayloadToken } from '../../src/helpers/payload-token.helper';
import type { TokenMessage, TokenName, TokenPayload } from '../../src/helpers/payload-token.helper';
import { ValidatedPayloadToken } from '../../src/helpers/validated-payload-token.helper';

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

/** What a receiver gets from a structured-clone or JSON channel: data without any compile-time guarantee. */
function receiveOverWire(message: unknown): unknown {
  return JSON.parse(JSON.stringify(message));
}

/** A minimal typed sender, as an event bus or channel would declare it. */
function send<TPayload>(token: PayloadToken<TPayload>, payload: NoInfer<TPayload>) {
  return token.message(payload);
}

describe('definePayloadTokens', () => {
  it('validates boundary payloads only for members declared with a schema', () => {
    expect(SESSION_EVENTS.STARTED).not.toBeInstanceOf(ValidatedPayloadToken);
    expect(SESSION_EVENTS.ENDED.parse(receiveOverWire({ userId: 'u1', durationMs: 30 }))).toEqual({
      userId: 'u1',
      durationMs: 30,
    });
  });

  it('requires a payload for every member of the enum', () => {
    expect(() =>
      // @ts-expect-error CHECKED_OUT has no payload
      definePayloadTokens(cartEventNamesEnumwaii, { ITEM_ADDED: payloadOf<{ sku: string }>() }),
    ).toThrow(CART_EVENT_NAMES.CHECKED_OUT);
  });

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
  it('checks payloads against the token at compile time', () => {
    expect(send(SESSION_EVENTS.STARTED, { userId: 'u1' })).toEqual({
      name: 'session.started',
      payload: { userId: 'u1' },
    });

    // @ts-expect-error the payload does not match the token
    expectTypeOf(send(SESSION_EVENTS.STARTED, { userId: 1 })).toBeObject();
    const unchecked: unknown = receiveOverWire({ userId: 'u1' });
    // @ts-expect-error unvalidated input is not a payload
    expectTypeOf(send(SESSION_EVENTS.STARTED, unchecked)).toBeObject();
  });

  it('takes its name from an enumwaii member, never a raw string', () => {
    expectTypeOf(new PayloadToken<{ userId: string }>(CART_EVENT_NAMES.CHECKED_OUT)).toBeObject();

    // @ts-expect-error raw strings are not token names
    expectTypeOf(new PayloadToken<{ userId: string }>('cart.checked-out')).toBeObject();
  });

  it('infers the payload of a standalone validated token from its schema', () => {
    const token = new ValidatedPayloadToken(CART_EVENT_NAMES.CHECKED_OUT, z.object({ orderId: z.uuid() }));

    expectTypeOf<TokenPayload<typeof token>>().toEqualTypeOf<{ orderId: string }>();
    expect(token.safeParse({ orderId: 'not-a-uuid' }).success).toBe(false);
  });

  it('narrows a message of a token set to one token', () => {
    const message: TokenMessage<(typeof SESSION_EVENTS)[keyof typeof SESSION_EVENTS]> = SESSION_EVENTS.ENDED.message({
      userId: 'u1',
      durationMs: 5,
    });

    expect(SESSION_EVENTS.STARTED.matches(message)).toBe(false);
    if (!SESSION_EVENTS.ENDED.matches(message)) throw new Error('Expected a session end message');
    expectTypeOf(message.payload).toEqualTypeOf<{ userId: string; durationMs: number }>();
  });

  it('does not vouch for a message that was never parsed', () => {
    const raw = { name: 'session.ended', payload: receiveOverWire({ userId: 'u1' }) };

    expect(SESSION_EVENTS.ENDED.matches(raw)).toBe(true);
    if (SESSION_EVENTS.ENDED.matches(raw)) expectTypeOf(raw).toBeNever();
  });
});

describe('payloadMessageSchema', () => {
  const cartMessageSchema = payloadMessageSchema(CART_EVENTS);

  it('validates a received message against the schema of the token its name selects', () => {
    const sent = CART_EVENTS.ITEM_ADDED.message({ sku: 'tea', quantity: 2 });

    const received = cartMessageSchema.parse(receiveOverWire(sent));

    expect(received).toEqual(sent);
    if (!CART_EVENTS.ITEM_ADDED.matches(received)) throw new Error('Expected an item added message');
    expectTypeOf(received.payload.quantity).toBeNumber();
  });

  it('rejects messages whose name is not in the set', () => {
    const result = cartMessageSchema.safeParse(receiveOverWire({ name: 'cart.emptied', payload: {} }));

    expect(result.success).toBe(false);
  });

  it('rejects a payload that only fits another token of the set', () => {
    const result = cartMessageSchema.safeParse(
      receiveOverWire({ name: CART_EVENT_NAMES.ITEM_ADDED, payload: { orderId: 'o1' } }),
    );

    expect(result.success).toBe(false);
  });

  it('only accepts sets whose tokens can all be validated', () => {
    // @ts-expect-error STARTED stays in the process and has no schema
    expectTypeOf(payloadMessageSchema(SESSION_EVENTS)).toBeObject();
  });
});
