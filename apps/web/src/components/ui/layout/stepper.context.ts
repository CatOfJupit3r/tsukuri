import { createContext, use } from 'react';

interface iStepperContextValue {
  rootId: string;
  steps: readonly string[];
  value: string;
  onValueChange: (value: string) => unknown;
}

export const StepperContext = createContext<iStepperContextValue | null>(null);
export const StepperItemContext = createContext<string | null>(null);

export function useRequiredStepperContext() {
  const context = use(StepperContext);
  if (!context) throw new Error('Stepper components must be rendered inside Stepper.');
  return context;
}

export function useRequiredStepperItemContext() {
  const value = use(StepperItemContext);
  if (!value) throw new Error('Stepper item components must be rendered inside StepperItem.');
  return value;
}
