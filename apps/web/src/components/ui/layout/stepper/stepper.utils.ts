import { KEYBOARD_KEYS } from '@startername/common/enums/keyboard-keys.enums';

import { STEPPER_STEP_PART_ID_SEGMENTS, STEPPER_STEP_STATES } from '#~/components/ui/layout/stepper/stepper.constants';
import type { StepperStepPart, StepperStepState } from '#~/components/ui/layout/stepper/stepper.constants';

export function getKeyboardStepIndex(key: string, currentIndex: number, stepCount: number) {
  switch (key) {
    case KEYBOARD_KEYS.HOME: {
      return 0;
    }
    case KEYBOARD_KEYS.END: {
      return stepCount - 1;
    }
    case KEYBOARD_KEYS.ARROW_LEFT:
    case KEYBOARD_KEYS.ARROW_UP: {
      return Math.max(0, currentIndex - 1);
    }
    case KEYBOARD_KEYS.ARROW_RIGHT:
    case KEYBOARD_KEYS.ARROW_DOWN: {
      return Math.min(stepCount - 1, currentIndex + 1);
    }
    default: {
      return null;
    }
  }
}

export function getStepState(isActive: boolean, stepIndex: number, activeIndex: number): StepperStepState {
  if (isActive) return STEPPER_STEP_STATES.ACTIVE;
  return stepIndex < activeIndex ? STEPPER_STEP_STATES.COMPLETED : STEPPER_STEP_STATES.INACTIVE;
}

export function getStepId(rootId: string, part: StepperStepPart, value: string) {
  return `${rootId}-${STEPPER_STEP_PART_ID_SEGMENTS.get(part)}-${value}`;
}
