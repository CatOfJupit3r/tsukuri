import type { IconType } from 'react-icons';
import { LuCloudOff, LuLoader, LuSave, LuTriangleAlert } from 'react-icons/lu';

import { FORM_SAVE_STATES } from '#~/constants/ux-primitives';
import type { FormSaveState } from '#~/constants/ux-primitives';

export const AUTOSAVE_STATUS_LABELS = {
  [FORM_SAVE_STATES.SAVING]: 'Saving changes…',
  [FORM_SAVE_STATES.SAVED]: 'Changes saved',
  [FORM_SAVE_STATES.FAILED]: 'Changes could not be saved',
  [FORM_SAVE_STATES.OFFLINE]: 'Offline. Changes are stored on this device',
  [FORM_SAVE_STATES.CONFLICT]: 'Changes conflict with a newer version',
} satisfies Record<FormSaveState, string>;

export const AUTOSAVE_STATUS_ICONS = {
  [FORM_SAVE_STATES.SAVING]: LuLoader,
  [FORM_SAVE_STATES.SAVED]: LuSave,
  [FORM_SAVE_STATES.FAILED]: LuTriangleAlert,
  [FORM_SAVE_STATES.OFFLINE]: LuCloudOff,
  [FORM_SAVE_STATES.CONFLICT]: LuTriangleAlert,
} satisfies Record<FormSaveState, IconType>;
