import { act, renderHook } from '@testing-library/react';

import { FORM_SAVE_STATES } from '#~/constants/ux-primitives';
import { useFormAutosave } from '#~/hooks/form-autosave/use-form-autosave';

interface iProfileValues {
  note: string;
  title: string;
}

const AUTOSAVE_DEBOUNCE_MS = 300;

function createForm(values: iProfileValues) {
  return { state: { values } };
}

describe('useFormAutosave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('waits for the debounce window and saves only the changed fields', async () => {
    const form = createForm({ note: 'keep', title: 'before' });
    const onSave = vi.fn(async () => undefined);
    const { result } = renderHook(() => useFormAutosave({ form, onSave, debounce: AUTOSAVE_DEBOUNCE_MS }));
    act(() => result.current.resetTracking());

    form.state.values = { note: 'keep', title: 'after' };
    act(() => {
      void result.current.handleAutoSave();
    });
    expect(onSave).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS);
    });

    expect(onSave).toHaveBeenCalledOnce();
    expect(onSave).toHaveBeenCalledWith({ title: 'after' }, expect.objectContaining({ requestSequence: 1 }));
    expect(result.current.saveState).toBe(FORM_SAVE_STATES.SAVED);
    expect(result.current.hasUnacknowledgedChanges).toBe(false);
  });

  it('collapses edits made inside one debounce window into the latest save', async () => {
    const form = createForm({ note: 'keep', title: 'before' });
    const onSave = vi.fn(async () => undefined);
    const { result } = renderHook(() => useFormAutosave({ form, onSave, debounce: AUTOSAVE_DEBOUNCE_MS }));
    act(() => result.current.resetTracking());

    let firstOutcome: Promise<boolean> | undefined;
    form.state.values = { note: 'keep', title: 'draft' };
    act(() => {
      firstOutcome = result.current.handleAutoSave();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS / 2);
    });
    form.state.values = { note: 'keep', title: 'final' };
    act(() => {
      void result.current.handleAutoSave();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS);
    });

    expect(onSave).toHaveBeenCalledOnce();
    expect(onSave).toHaveBeenCalledWith({ title: 'final' }, expect.anything());
    await expect(firstOutcome).resolves.toBe(false);
  });

  it('reports a failed save and resends the same request on retry', async () => {
    const form = createForm({ note: 'keep', title: 'before' });
    const onSave = vi.fn().mockRejectedValueOnce(new Error('network down')).mockResolvedValue(undefined);
    const { result } = renderHook(() => useFormAutosave({ form, onSave }));
    act(() => result.current.resetTracking());

    form.state.values = { note: 'keep', title: 'after' };
    await act(async () => {
      await result.current.handleAutoSave();
    });
    expect(result.current.saveState).toBe(FORM_SAVE_STATES.FAILED);
    expect(result.current.hasUnacknowledgedChanges).toBe(true);

    await act(async () => {
      await result.current.retry();
    });

    expect(onSave).toHaveBeenCalledTimes(2);
    expect(onSave.mock.calls[1]).toEqual(onSave.mock.calls[0]);
    expect(result.current.saveState).toBe(FORM_SAVE_STATES.SAVED);
  });
});
