import type { ReactNode } from 'react';
import type { ActionMeta, GroupBase } from 'react-select';

/** select option type */
export interface iOptionType<TValue extends string = string> {
  label: string;
  value: TValue;
  icon?: ReactNode | Nil;
  description?: ReactNode;
  meta?: ReactNode;
}

/** a single option or a group of options, as accepted by the select `options` prop */
export type iSelectOption<TValue extends string = string> = iOptionType<TValue> | GroupBase<iOptionType<TValue>>;

/** callback fired by a single select when the chosen value changes */
export type SingleSelectValueChangeHandler<TValue extends string = string> = (
  value: TValue | null,
  option: iOptionType<TValue> | null,
  action: ActionMeta<iOptionType<TValue>>,
) => void;

/** callback fired by a multi select when the chosen values change */
export type MultiSelectValueChangeHandler<TValue extends string = string> = (
  values: TValue[],
  options: Array<iOptionType<TValue>>,
  action: ActionMeta<iOptionType<TValue>>,
) => void;
