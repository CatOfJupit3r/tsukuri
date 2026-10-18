import type { RegisterableHotkey } from '@tanstack/react-hotkeys';
import { useHotkey } from '@tanstack/react-hotkeys';

export function useOnKeyPress(targetKey: RegisterableHotkey, cb: (event: KeyboardEvent) => unknown) {
  useHotkey(targetKey, cb);
}
