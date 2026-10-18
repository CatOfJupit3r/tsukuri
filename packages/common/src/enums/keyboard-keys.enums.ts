import { em } from 'enumwaii';

/** `KeyboardEvent.key` values the application reacts to. */
const keyboardKeysEnumwaii = em({
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  ENTER: 'Enter',
  ESCAPE: 'Escape',
  TAB: 'Tab',
  SPACE: ' ',
  BACKSPACE: 'Backspace',
  DELETE: 'Delete',
  HOME: 'Home',
  END: 'End',
  PAGE_UP: 'PageUp',
  PAGE_DOWN: 'PageDown',
});

export const KEYBOARD_KEYS = keyboardKeysEnumwaii.enum;
export type KeyboardKey = (typeof keyboardKeysEnumwaii)['~type'];
