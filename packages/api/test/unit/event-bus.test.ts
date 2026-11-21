import { em } from 'enumwaii';

import { definePayloadTokens, payloadOf } from '@startername/common/helpers/payload-token-set.helper';

import { EventBus } from '#~/features/events/event-bus';

const testEventNamesEnumwaii = em({ TEST: 'test.event', UNUSED: 'test.unused' });

const TEST_EVENTS = definePayloadTokens(testEventNamesEnumwaii, {
  TEST: payloadOf<{ value: number }>(),
  UNUSED: payloadOf<{ value: number }>(),
});
const testEvent = TEST_EVENTS.TEST;

describe('EventBus', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('emit calls every handler synchronously and reports whether any was registered', () => {
    const results: number[] = [];
    eventBus.on(testEvent, ({ value }) => results.push(value));

    expect(eventBus.emit(testEvent, { value: 1 })).toBe(true);
    expect(results).toEqual([1]);
    expect(eventBus.emit(TEST_EVENTS.UNUSED, { value: 2 })).toBe(false);
  });

  it('checks emitted and handled payloads against the token at compile time', () => {
    const unchecked: unknown = { value: 1 };

    // Never called: `check-types` fails when one of these calls stops being rejected.
    expectTypeOf(async () => {
      // @ts-expect-error the payload does not match the token
      eventBus.emit(testEvent, { value: 'one' });
      // @ts-expect-error an unvalidated payload is not the token's payload
      eventBus.emit(testEvent, unchecked);
      // @ts-expect-error an unvalidated payload is not the token's payload
      await eventBus.emitAsync(testEvent, unchecked);
      // @ts-expect-error the handler expects another payload
      eventBus.on(testEvent, ({ value }: { value: string }) => value);
    }).toBeFunction();
  });

  it('emitAsync runs handlers in parallel and waits for all of them', async () => {
    vi.useFakeTimers();
    const delays: number[] = [];
    eventBus.on(testEvent, async ({ value }) => {
      await new Promise((resolve) => setTimeout(resolve, value));
      delays.push(value);
    });
    eventBus.on(testEvent, async ({ value }) => {
      await new Promise((resolve) => setTimeout(resolve, value));
      delays.push(value * 2);
    });

    const emitted = eventBus.emitAsync(testEvent, { value: 50 });
    // Sequential handlers would need 100ms, so both finish within 50ms only when they run in parallel
    await vi.advanceTimersByTimeAsync(50);

    expect(delays).toEqual([50, 100]);
    expect(await emitted).toBe(true);
  });

  it('emitAsync is best-effort: a failing handler neither rejects nor stops the others', async () => {
    const results: number[] = [];
    eventBus.on(testEvent, async () => {
      throw new Error('Handler error');
    });
    eventBus.on(testEvent, async ({ value }) => {
      results.push(value);
    });

    await expect(eventBus.emitAsync(testEvent, { value: 3 })).resolves.toBe(true);
    expect(results).toEqual([3]);
  });

  it('runs once-handlers a single time with either emit variant', async () => {
    const results: number[] = [];
    eventBus.once(testEvent, ({ value }) => results.push(value));

    await eventBus.emitAsync(testEvent, { value: 1 });
    await eventBus.emitAsync(testEvent, { value: 2 });
    eventBus.emit(testEvent, { value: 3 });

    expect(results).toEqual([1]);
  });

  it('emitAsync calls on-handlers every time and once-handlers a single time when both are registered', async () => {
    const results: string[] = [];
    eventBus.on(testEvent, ({ value }) => results.push(`on:${value}`));
    eventBus.once(testEvent, ({ value }) => results.push(`once:${value}`));

    await eventBus.emitAsync(testEvent, { value: 1 });
    await eventBus.emitAsync(testEvent, { value: 2 });

    expect(results).toEqual(['on:1', 'once:1', 'on:2']);
  });

  it('stops calling a handler after off', () => {
    const results: number[] = [];
    const handler = ({ value }: { value: number }) => results.push(value);
    eventBus.on(testEvent, handler);
    eventBus.off(testEvent, handler);

    eventBus.emit(testEvent, { value: 1 });

    expect(results).toEqual([]);
  });

  it('streams every payload emitted after subscribing until the signal aborts', async () => {
    const controller = new AbortController();
    const stream = eventBus.stream(testEvent, controller.signal);

    eventBus.emit(testEvent, { value: 1 });
    eventBus.emit(testEvent, { value: 2 });

    const received: number[] = [];
    for await (const { value } of stream) {
      received.push(value);
      if (received.length === 2) controller.abort();
    }

    expect(received).toEqual([1, 2]);
  });
});
