import type { GeneratorErrorCode } from '#~/enums/generator-error-codes.enums';

export class GeneratorError extends Error {
  public readonly code: GeneratorErrorCode;

  constructor(code: GeneratorErrorCode, message: string) {
    super(message);
    this.name = 'GeneratorError';
    this.code = code;
  }
}
