import { useState } from 'react';
import type { KeyboardEvent } from 'react';

import { KEYBOARD_KEYS } from '@startername/common/enums/keyboard-keys.enums';

import { mergeTagValues, parseTagInput } from '#~/components/ui/form/form-fields/tag-array.utils';

interface iUseTagArrayInputProps {
  maxItems?: number;
  onBlur: () => unknown;
  onChange: (values: string[]) => unknown;
  onCommit?: () => unknown;
  values: string[];
}

export function useTagArrayInput({ maxItems, onBlur, onChange, onCommit, values }: iUseTagArrayInputProps) {
  const [inputValue, setInputValue] = useState('');

  const finishWithoutChange = (shouldBlur: boolean) => {
    if (shouldBlur) {
      onBlur();
      onCommit?.();
    }
  };

  const handleCommit = (nextValues: string[], shouldBlur = false) => {
    onChange(nextValues);

    if (shouldBlur) {
      onBlur();
    }

    onCommit?.();
  };

  const handleAdd = (shouldBlur = false) => {
    const parsedValues = parseTagInput(inputValue);

    if (parsedValues.length === 0) {
      finishWithoutChange(shouldBlur);
      return;
    }

    const uniqueValues = parsedValues.filter((value) => !values.includes(value));

    if (uniqueValues.length === 0) {
      setInputValue('');
      finishWithoutChange(shouldBlur);
      return;
    }

    setInputValue('');
    handleCommit(mergeTagValues(values, uniqueValues, maxItems), shouldBlur);
  };

  const handleRemove = (valueToRemove: string) => {
    handleCommit(values.filter((value) => value !== valueToRemove));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === KEYBOARD_KEYS.ENTER) {
      event.preventDefault();
      handleAdd();
    }
  };

  return {
    handleAdd,
    handleKeyDown,
    handleRemove,
    inputValue,
    isAtLimit: maxItems != null && values.length >= maxItems,
    setInputValue,
  };
}
