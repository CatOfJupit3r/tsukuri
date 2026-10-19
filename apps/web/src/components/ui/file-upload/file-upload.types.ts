import type { TextDirection } from '@base-ui/react/direction-provider';
import type { ComponentProps } from 'react';

export interface iFileUploadCallbackProps {
  onValueChange?: (files: File[]) => unknown;
  onAccept?: (files: File[]) => unknown;
  onFileAccept?: (file: File) => unknown;
  onFileReject?: (file: File, message: string) => unknown;
  onFileValidate?: (file: File) => string | null | undefined;
  onUpload?: (
    files: File[],
    options: {
      onProgress: (file: File, progress: number) => unknown;
      onSuccess: (file: File) => unknown;
      onError: (file: File, error: Error) => unknown;
    },
  ) => unknown;
}

export interface iFileUploadProps
  extends Omit<ComponentProps<'div'>, 'defaultValue' | 'onChange'>, iFileUploadCallbackProps {
  value?: File[];
  defaultValue?: File[];
  accept?: string;
  maxFiles?: number;
  maxSize?: number;
  dir?: TextDirection;
  label?: string;
  name?: string;
  asChild?: boolean;
  isDisabled?: boolean;
  isInvalid?: boolean;
  isMultiple?: boolean;
  isRequired?: boolean;
}
