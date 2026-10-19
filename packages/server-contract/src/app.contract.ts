import { generatedContracts } from './generated/contracts';

/** Every installed module's contract, keyed as in the API router. */
export const CONTRACT = generatedContracts;

export type AppContract = typeof CONTRACT;
