import { em } from 'enumwaii';

const stepperStepStateEnumwaii = em(['ACTIVE', 'COMPLETED', 'INACTIVE']);

export const STEPPER_STEP_STATES = stepperStepStateEnumwaii.enum;
export type StepperStepState = (typeof stepperStepStateEnumwaii)['~type'];

export const STEPPER_STEP_STATE_DATA_VALUES = stepperStepStateEnumwaii.derive(
  [STEPPER_STEP_STATES.ACTIVE, 'active'],
  [STEPPER_STEP_STATES.COMPLETED, 'completed'],
  [STEPPER_STEP_STATES.INACTIVE, 'inactive'],
);

const stepperStepPartEnumwaii = em(['TRIGGER', 'CONTENT']);

export const STEPPER_STEP_PARTS = stepperStepPartEnumwaii.enum;
export type StepperStepPart = (typeof stepperStepPartEnumwaii)['~type'];

export const STEPPER_STEP_PART_ID_SEGMENTS = stepperStepPartEnumwaii.derive(
  [STEPPER_STEP_PARTS.TRIGGER, 'trigger'],
  [STEPPER_STEP_PARTS.CONTENT, 'content'],
);
