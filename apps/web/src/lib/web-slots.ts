import type { ComponentType } from 'react';

import { generatedSlots } from '#~/generated/web-slots';

/** The installed modules' components per slot, typed for rendering even while a slot is empty. */
export const webSlots: Record<keyof typeof generatedSlots, readonly ComponentType[]> = generatedSlots;
