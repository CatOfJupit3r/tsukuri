import { confirm, intro, isCancel, log, multiselect, note, outro, select, spinner, text } from '@clack/prompts';

import { GeneratorError } from '@~/engine/generator-error';
import { GENERATOR_ERROR_CODES } from '@~/enums/generator-error-codes.enums';

import type { iPrompter, iPromptOption } from './prompter';

/** Turns clack's cancel symbol into a `CANCELLED` error; prompt values are never symbols here. */
function unwrap<T>(value: T): Exclude<T, symbol> {
  if (isCancel(value)) {
    throw new GeneratorError(GENERATOR_ERROR_CODES.CANCELLED, 'Cancelled; nothing was written');
  }
  return value as Exclude<T, symbol>;
}

/** clack's option type is conditional on the value type, so options are passed through as-is. */
type iClackOptions<T> = Parameters<typeof select<T>>[0]['options'];

export class ClackPrompter implements iPrompter {
  public intro(message: string) {
    intro(message);
  }

  public outro(message: string) {
    outro(message);
  }

  public note(message: string, title: string) {
    note(message, title);
  }

  public info(message: string) {
    log.info(message);
  }

  public warn(message: string) {
    log.warn(message);
  }

  public error(message: string) {
    log.error(message);
  }

  public async text(options: Parameters<iPrompter['text']>[0]) {
    return unwrap(
      await text({
        message: options.message,
        placeholder: options.defaultValue,
        defaultValue: options.defaultValue,
        validate: (value) => options.validate(value?.length ? value : options.defaultValue),
      }),
    );
  }

  public async select<T>(options: { message: string; options: iPromptOption<T>[]; initialValue?: T }): Promise<T> {
    return unwrap<T | symbol>(
      await select<T>({
        message: options.message,
        options: options.options as iClackOptions<T>,
        initialValue: options.initialValue,
      }),
    );
  }

  public async multiselect<T>(options: {
    message: string;
    options: iPromptOption<T>[];
    initialValues: T[];
  }): Promise<T[]> {
    return unwrap<T[] | symbol>(
      await multiselect<T>({
        message: options.message,
        options: options.options as iClackOptions<T>,
        initialValues: options.initialValues,
        required: false,
      }),
    );
  }

  public async confirm(options: { message: string; initialValue: boolean }) {
    return unwrap(await confirm(options));
  }

  public spinner() {
    const indicator = spinner();
    return {
      start: (message: string) => indicator.start(message),
      stop: (message: string) => indicator.stop(message),
    };
  }
}
