import type { iCommandRunner } from '#~/cli/command-runner';
import type { iPrompter, iPromptOption } from '#~/cli/prompts/prompter';
import { GeneratorError } from '#~/engine/generator-error';
import { GENERATOR_ERROR_CODES } from '#~/enums/generator-error-codes.enums';

export interface iRecordedPrompt {
  kind: 'text' | 'select' | 'multiselect' | 'confirm';
  message: string;
  options: unknown[];
  initial: unknown;
}

type iAnswer = unknown | ((prompt: iRecordedPrompt) => unknown);

/** Marks the prompt at which the user presses Ctrl+C. */
export const CANCEL = Symbol('cancel');

/**
 * Answers prompts by message, in order: each message maps to a queue of answers, so a prompt
 * asked twice (after "Change answers") takes the next one. Unexpected prompts fail the test.
 */
export class ScriptedPrompter implements iPrompter {
  public readonly prompts: iRecordedPrompt[] = [];
  public readonly messages: string[] = [];
  private readonly answers: Map<string, iAnswer[]>;

  constructor(answers: Record<string, iAnswer | iAnswer[]>) {
    this.answers = new Map(
      Object.entries(answers).map(([message, value]) => [message, Array.isArray(value) ? [...value] : [value]]),
    );
  }

  public intro(message: string) {
    this.messages.push(message);
  }

  public outro(message: string) {
    this.messages.push(message);
  }

  public note(message: string, title: string) {
    this.messages.push(`${title}: ${message}`);
  }

  public info(message: string) {
    this.messages.push(message);
  }

  public warn(message: string) {
    this.messages.push(message);
  }

  public error(message: string) {
    this.messages.push(message);
  }

  public async text(options: Parameters<iPrompter['text']>[0]) {
    const value = this.answer<string>({
      kind: 'text',
      message: options.message,
      options: [],
      initial: options.defaultValue,
    });
    return value || options.defaultValue;
  }

  public async select<T>(options: { message: string; options: iPromptOption<T>[]; initialValue?: T }) {
    return this.answer<T>({
      kind: 'select',
      message: options.message,
      options: options.options,
      initial: options.initialValue,
    });
  }

  public async multiselect<T>(options: { message: string; options: iPromptOption<T>[]; initialValues: T[] }) {
    return this.answer<T[]>({
      kind: 'multiselect',
      message: options.message,
      options: options.options,
      initial: options.initialValues,
    });
  }

  public async confirm(options: { message: string; initialValue: boolean }) {
    return this.answer<boolean>({
      kind: 'confirm',
      message: options.message,
      options: [],
      initial: options.initialValue,
    });
  }

  public spinner() {
    return {
      start: (message: string) => this.messages.push(message),
      stop: (message: string) => this.messages.push(message),
    };
  }

  private answer<T>(prompt: iRecordedPrompt): T {
    this.prompts.push(prompt);
    const queue = this.answers.get(prompt.message);
    if (!queue || queue.length === 0) throw new Error(`Unexpected prompt: ${prompt.message}`);

    const next = queue.shift();
    const value = typeof next === 'function' ? (next as (recorded: iRecordedPrompt) => unknown)(prompt) : next;
    if (value === CANCEL) throw new GeneratorError(GENERATOR_ERROR_CODES.CANCELLED, 'Cancelled; nothing was written');
    return value as T;
  }
}

export class RecordingRunner implements iCommandRunner {
  public readonly commands: string[] = [];

  public async run(command: string, args: string[]) {
    this.commands.push([command, ...args].join(' '));
    return 0;
  }
}

/** The values of a recorded prompt's options. */
export function optionValues(prompt: iRecordedPrompt | undefined) {
  return (prompt?.options ?? []).map((option) => (option as iPromptOption<unknown>).value);
}
