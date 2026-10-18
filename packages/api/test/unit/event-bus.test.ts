import { EventBus } from '#~/features/events/event-bus';
import { Listener } from '#~/features/events/listener.class';

const testListener = new Listener<{ value: number }>('TEST_EVENT');

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
    eventBus.on(testListener, ({ value }) => results.push(value));

    expect(eventBus.emit(testListener, { value: 1 })).toBe(true);
    expect(results).toEqual([1]);
    expect(eventBus.emit(new Listener<{ value: number }>('UNUSED'), { value: 2 })).toBe(false);
  });

  it('emitAsync runs handlers in parallel and waits for all of them', async () => {
    vi.useFakeTimers();
    const delays: number[] = [];
    eventBus.on(testListener, async ({ value }) => {
      await new Promise((resolve) => setTimeout(resolve, value));
      delays.push(value);
    });
    eventBus.on(testListener, async ({ value }) => {
      await new Promise((resolve) => setTimeout(resolve, value));
      delays.push(value * 2);
    });

    const emitted = eventBus.emitAsync(testListener, { value: 50 });
    // Sequential handlers would need 100ms, so both finish within 50ms only when they run in parallel
    await vi.advanceTimersByTimeAsync(50);

    expect(delays).toEqual([50, 100]);
    expect(await emitted).toBe(true);
  });

  it('emitAsync is best-effort: a failing handler neither rejects nor stops the others', async () => {
    const results: number[] = [];
    eventBus.on(testListener, async () => {
      throw new Error('Handler error');
    });
    eventBus.on(testListener, async ({ value }) => {
      results.push(value);
    });

    await expect(eventBus.emitAsync(testListener, { value: 3 })).resolves.toBe(true);
    expect(results).toEqual([3]);
  });

  it('runs once-handlers a single time with either emit variant', async () => {
    const results: number[] = [];
    eventBus.once(testListener, ({ value }) => results.push(value));

    await eventBus.emitAsync(testListener, { value: 1 });
    await eventBus.emitAsync(testListener, { value: 2 });
    eventBus.emit(testListener, { value: 3 });

    expect(results).toEqual([1]);
  });

  it('stops calling a handler after off', () => {
    const results: number[] = [];
    const handler = ({ value }: { value: number }) => results.push(value);
    eventBus.on(testListener, handler);
    eventBus.off(testListener, handler);

    eventBus.emit(testListener, { value: 1 });

    expect(results).toEqual([]);
  });

  it('streams every payload emitted after subscribing until the signal aborts', async () => {
    const controller = new AbortController();
    const stream = eventBus.stream(testListener, controller.signal);

    eventBus.emit(testListener, { value: 1 });
    eventBus.emit(testListener, { value: 2 });

    const received: number[] = [];
    for await (const { value } of stream) {
      received.push(value);
      if (received.length === 2) controller.abort();
    }

    expect(received).toEqual([1, 2]);
  });
});
