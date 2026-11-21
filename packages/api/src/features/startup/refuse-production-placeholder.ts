import { env } from '#~/constants/env';
import { NODE_ENVIRONMENTS } from '#~/constants/node-environments.enums';

interface iPlaceholderCheck {
  variableName: string;
  value: string;
  /** The value `.env.example` ships. */
  placeholder: string;
  /** What to do about it; follows "still the placeholder from .env.example." in the message. */
  instruction: string;
}

/** Production refuses to start while a secret still holds the value `.env.example` ships. */
export function refuseProductionPlaceholder({ variableName, value, placeholder, instruction }: iPlaceholderCheck) {
  if (env.NODE_ENV !== NODE_ENVIRONMENTS.PRODUCTION || value !== placeholder) return;
  throw new Error(`${variableName} is still the placeholder from .env.example. ${instruction}`);
}
