import type { TextDirection } from '@base-ui/react/direction-provider';
import { useId, useMemo } from 'react';
import type { RefObject } from 'react';

import type { iFileUploadContextValue } from '#~/components/ui/file-upload/file-upload-context';

interface iUseFileUploadContextValueProps extends Pick<iFileUploadContextValue, 'urlCache'> {
  dir: TextDirection;
  inputRef: RefObject<HTMLInputElement | null>;
  isDisabled: boolean;
}

export function useFileUploadContextValue({ dir, inputRef, isDisabled, urlCache }: iUseFileUploadContextValueProps) {
  const inputId = useId();
  const dropzoneId = useId();
  const listId = useId();
  const labelId = useId();

  return useMemo<iFileUploadContextValue>(
    () => ({
      dropzoneId,
      inputId,
      listId,
      labelId,
      dir,
      disabled: isDisabled,
      inputRef,
      urlCache,
    }),
    [dropzoneId, inputId, listId, labelId, dir, isDisabled, inputRef, urlCache],
  );
}
