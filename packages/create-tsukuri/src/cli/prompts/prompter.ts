export interface iPromptOption<T> {
  value: T;
  label: string;
  hint?: string;
}

export interface iSpinner {
  start: (message: string) => void;
  stop: (message: string) => void;
}

/**
 * Everything `create` and `add` ask the user. Implementations throw a `CANCELLED`
 * `GeneratorError` when the user cancels, so nothing after the cancelled prompt runs.
 */
export interface iPrompter {
  intro: (message: string) => void;
  outro: (message: string) => void;
  note: (message: string, title: string) => void;
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
  text: (options: {
    message: string;
    defaultValue: string;
    validate: (value: string) => string | undefined;
  }) => Promise<string>;
  select: <T>(options: { message: string; options: iPromptOption<T>[]; initialValue?: T }) => Promise<T>;
  multiselect: <T>(options: { message: string; options: iPromptOption<T>[]; initialValues: T[] }) => Promise<T[]>;
  confirm: (options: { message: string; initialValue: boolean }) => Promise<boolean>;
  spinner: () => iSpinner;
}

export const PROMPTER_TOKEN = Symbol.for('create-tsukuri.prompter');
