import type { ChangeEvent } from 'react';

import type { iFileUploadContextValue } from '#~/components/ui/file-upload/file-upload-context';
import type { iFileUploadProps } from '#~/components/ui/file-upload/file-upload.types';

interface iFileUploadHiddenInputProps
  extends
    Pick<iFileUploadContextValue, 'dropzoneId' | 'inputId' | 'inputRef' | 'labelId'>,
    Pick<iFileUploadProps, 'accept' | 'label' | 'name'> {
  isDisabled: boolean;
  isMultiple: boolean;
  isRequired: boolean;
  onInputChange: (event: ChangeEvent<HTMLInputElement>) => unknown;
}

export function FileUploadHiddenInput({
  accept,
  dropzoneId,
  inputId,
  inputRef,
  isDisabled,
  isMultiple,
  isRequired,
  label,
  labelId,
  name,
  onInputChange,
}: iFileUploadHiddenInputProps) {
  return (
    <>
      <input
        type="file"
        id={inputId}
        aria-labelledby={labelId}
        aria-describedby={dropzoneId}
        ref={inputRef}
        tabIndex={-1}
        accept={accept}
        name={name}
        className="sr-only"
        disabled={isDisabled}
        multiple={isMultiple}
        required={isRequired}
        onChange={onInputChange}
      />
      <div id={labelId} className="sr-only">
        {label ?? 'File upload'}
      </div>
    </>
  );
}
