import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentProps, KeyboardEvent, ReactNode } from 'react';

import { KEYBOARD_KEYS } from '@startername/common/enums/keyboard-keys.enums';

import { cn } from '#~/lib/utils';

interface iEditableContextValue {
  value: string;
  placeholder: string;
  draftValue: string;
  isEditing: boolean;
  isDisabled: boolean;
  setDraftValue: (value: string) => void;
  beginEditing: () => void;
  cancelEditing: () => void;
  submit: () => void;
}

const EditableContext = createContext<iEditableContextValue | null>(null);

function useEditableContext() {
  const context = useContext(EditableContext);

  if (!context) {
    throw new Error('Editable components must be rendered inside Editable.');
  }

  return context;
}

interface iEditableProps extends Omit<ComponentProps<'div'>, 'onSubmit'> {
  value: string;
  placeholder?: string;
  isDisabled?: boolean;
  isRequired?: boolean;
  onSubmit: (value: string) => void;
  children: ReactNode;
}

export function Editable({
  value,
  placeholder = '',
  isDisabled = false,
  isRequired = true,
  onSubmit,
  children,
  className,
  ...props
}: iEditableProps) {
  const [draftValue, setDraftValue] = useState(value);
  const [isEditing, setIsEditing] = useState(false);

  const beginEditing = useCallback(() => {
    if (isDisabled) return;
    setDraftValue(value);
    setIsEditing(true);
  }, [isDisabled, value]);

  const cancelEditing = useCallback(() => {
    setDraftValue(value);
    setIsEditing(false);
  }, [value]);

  const submit = useCallback(() => {
    const nextValue = draftValue.trim();
    if ((!isRequired || nextValue) && nextValue !== value) onSubmit(nextValue);
    setIsEditing(false);
  }, [draftValue, isRequired, onSubmit, value]);

  const contextValue = useMemo(
    () => ({
      value,
      placeholder,
      draftValue,
      isEditing,
      isDisabled,
      setDraftValue,
      beginEditing,
      cancelEditing,
      submit,
    }),
    [value, placeholder, draftValue, isEditing, isDisabled, beginEditing, cancelEditing, submit],
  );

  return (
    <EditableContext.Provider value={contextValue}>
      <div className={cn('min-w-0', className)} {...props}>
        {children}
      </div>
    </EditableContext.Provider>
  );
}

export function EditablePreview({ className, ...props }: ComponentProps<'button'>) {
  const { value, placeholder, isEditing, isDisabled, beginEditing } = useEditableContext();

  if (isEditing) return null;

  return (
    <button
      type="button"
      className={cn('w-full cursor-text rounded-sm text-left outline-none focus-visible:ring-2', className)}
      disabled={isDisabled}
      onClick={beginEditing}
      {...props}
    >
      {value || placeholder}
    </button>
  );
}

export function EditableInput({ className, onBlur, onKeyDown, ...props }: ComponentProps<'input'>) {
  const { draftValue, isEditing, setDraftValue, cancelEditing, submit } = useEditableContext();
  const hasCancelledRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  if (!isEditing) return null;

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;

    if (event.key === KEYBOARD_KEYS.ENTER) {
      event.preventDefault();
      submit();
      return;
    }

    if (event.key === KEYBOARD_KEYS.ESCAPE) {
      event.preventDefault();
      hasCancelledRef.current = true;
      cancelEditing();
    }
  };

  return (
    <input
      ref={inputRef}
      value={draftValue}
      className={cn(
        'w-full rounded-sm border border-input bg-transparent px-2 py-1 outline-none focus:ring-2',
        className,
      )}
      onChange={(event) => setDraftValue(event.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={(event) => {
        onBlur?.(event);
        if (hasCancelledRef.current) {
          hasCancelledRef.current = false;
          return;
        }
        submit();
      }}
      {...props}
    />
  );
}
