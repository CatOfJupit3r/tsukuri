import { useCallback } from 'react';
import type { ChangeEvent, RefObject } from 'react';

import { FILE_UPLOAD_STORE_ACTION_TYPES } from '#~/components/ui/file-upload/file-upload.constants';
import type { iFileState, iStore } from '#~/components/ui/file-upload/file-upload.store';
import type { iFileUploadCallbackProps, iFileUploadProps } from '#~/components/ui/file-upload/file-upload.types';
import { validateIncomingFiles } from '#~/components/ui/file-upload/file-upload.validation';
import { useFilesUpload } from '#~/components/ui/file-upload/hooks/use-files-upload';

const FILE_UPLOAD_INVALID_RESET_DELAY_MS = 2000;

interface iUseFileUploadHandlersProps extends Pick<iFileUploadProps, 'maxFiles' | 'maxSize'> {
  acceptTypes: string[] | null;
  callbacksRef: RefObject<iFileUploadCallbackProps>;
  isControlled: boolean;
  isDisabled: boolean;
  store: iStore;
}

export function useFileUploadHandlers({
  acceptTypes,
  callbacksRef,
  isControlled,
  isDisabled,
  maxFiles,
  maxSize,
  store,
}: iUseFileUploadHandlersProps) {
  const onFilesUpload = useFilesUpload({ callbacksRef, store });

  const onFilesChange = useCallback(
    (originalFiles: File[]) => {
      if (isDisabled) return;

      const { acceptedFiles, isInvalidInput } = validateIncomingFiles(originalFiles, {
        maxFiles,
        currentFileCount: store.getState().files.size,
        acceptTypes,
        maxSize,
        onFileValidate: callbacksRef.current.onFileValidate,
        onFileReject: callbacksRef.current.onFileReject,
      });

      if (isInvalidInput) {
        store.dispatch({ type: FILE_UPLOAD_STORE_ACTION_TYPES.SET_INVALID, invalid: isInvalidInput });
        setTimeout(() => {
          store.dispatch({ type: FILE_UPLOAD_STORE_ACTION_TYPES.SET_INVALID, invalid: false });
        }, FILE_UPLOAD_INVALID_RESET_DELAY_MS);
      }

      if (acceptedFiles.length === 0) return;

      store.dispatch({ type: FILE_UPLOAD_STORE_ACTION_TYPES.ADD_FILES, files: acceptedFiles });

      if (isControlled && callbacksRef.current.onValueChange) {
        const currentFiles = Array.from(store.getState().files.values()).map((f: iFileState) => f.file);
        callbacksRef.current.onValueChange([...currentFiles]);
      }

      if (callbacksRef.current.onAccept) {
        callbacksRef.current.onAccept(acceptedFiles);
      }

      for (const file of acceptedFiles) {
        callbacksRef.current.onFileAccept?.(file);
      }

      if (callbacksRef.current.onUpload) {
        requestAnimationFrame(() => {
          void onFilesUpload(acceptedFiles);
        });
      }
    },
    [store, isControlled, callbacksRef, onFilesUpload, maxFiles, acceptTypes, maxSize, isDisabled],
  );

  const onInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files ?? []);
      onFilesChange(files);
      event.target.value = '';
    },
    [onFilesChange],
  );

  return { onInputChange };
}
